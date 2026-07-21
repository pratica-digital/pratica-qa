import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuditService, RequestMetadata } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { renderPasswordResetTemplate } from '../mail/templates/password-reset';
import { UsersRepository } from '../modules/users/repositories/users.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordRecoveryDto } from './dto/request-password-recovery.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './types/authenticated-user';

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, metadata?: RequestMetadata) {
    const user = await this.usersRepository.findByEmailWithPassword(dto.email);

    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
      await this.auditService.logLogin({
        userId: user?.id,
        email: dto.email,
        success: false,
        failureReason: 'INVALID_USER_OR_STATUS',
        metadata,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      await this.auditService.logLogin({
        userId: user.id,
        email: dto.email,
        success: false,
        failureReason: 'INVALID_PASSWORD',
        metadata,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    await this.auditService.logLogin({
      userId: user.id,
      email: dto.email,
      success: true,
      metadata,
    });

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      user: this.usersRepository.toPublicUser(user),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto, metadata?: RequestMetadata) {
    const user = await this.usersRepository.findById(userId);

    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
      throw new UnauthorizedException('Invalid token subject');
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is invalid');
    }

    const updatedUser = await this.usersRepository.update(user.id, {
      password: await bcrypt.hash(dto.newPassword, PASSWORD_SALT_ROUNDS),
      firstAccess: false,
      passwordChangedAt: new Date(),
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
    });

    await this.auditService.logAdminAction({
      actorUserId: user.id,
      targetUserId: user.id,
      action: 'USER_PASSWORD_CHANGED',
      metadata,
    });

    return this.usersRepository.toPublicUser(updatedUser);
  }

  async requestPasswordRecovery(dto: RequestPasswordRecoveryDto, metadata?: RequestMetadata) {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (user && user.status === UserStatus.ACTIVE && !user.deletedAt) {
      if (!this.mailService.isConfigured()) {
        await this.auditService.logAdminAction({
          targetUserId: user.id,
          action: 'PASSWORD_RECOVERY_EMAIL_SKIPPED',
          details: {
            email: user.email,
            reason: 'email_delivery_disabled',
          },
          metadata,
        });

        return {
          message: 'If the email exists, password reset instructions will be sent.',
        };
      }

      const resetToken = this.generateToken();
      const expiresAt = this.getPasswordResetExpirationDate();

      await this.usersRepository.update(user.id, {
        passwordResetTokenHash: await bcrypt.hash(resetToken, PASSWORD_SALT_ROUNDS),
        passwordResetTokenExpiresAt: expiresAt,
      });

      await this.auditService.logAdminAction({
        targetUserId: user.id,
        action: 'PASSWORD_RECOVERY_REQUESTED',
        details: { email: user.email },
        metadata,
      });

      await this.auditService.logAdminAction({
        targetUserId: user.id,
        action: 'PASSWORD_RECOVERY_TOKEN_GENERATED',
        details: {
          email: user.email,
          expiresAt: expiresAt.toISOString(),
        },
        metadata,
      });

      try {
        await this.sendPasswordRecoveryEmail(user, resetToken, expiresAt);

        await this.auditService.logAdminAction({
          targetUserId: user.id,
          action: 'PASSWORD_RECOVERY_EMAIL_SENT',
          details: {
            email: user.email,
            expiresAt: expiresAt.toISOString(),
            provider: 'microsoft-graph',
          },
          metadata,
        });
      } catch (emailError) {
        await this.usersRepository
          .update(user.id, {
            passwordResetTokenHash: null,
            passwordResetTokenExpiresAt: null,
          })
          .catch(() => undefined);

        await this.auditService.logAdminAction({
          targetUserId: user.id,
          action: 'PASSWORD_RECOVERY_EMAIL_FAILED',
          details: {
            email: user.email,
            error: this.getErrorMessage(emailError),
          },
          metadata,
        });

        throw new BadGatewayException(
          `Unable to send password recovery email: ${this.getErrorMessage(emailError)}`,
        );
      }
    }

    return {
      message: 'If the email exists, password reset instructions will be sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto, metadata?: RequestMetadata) {
    const user = await this.usersRepository.findByEmailWithPassword(dto.email);

    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      user.deletedAt ||
      !user.passwordResetTokenHash ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const isTokenValid = await bcrypt.compare(dto.token, user.passwordResetTokenHash);

    if (!isTokenValid) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const updatedUser = await this.usersRepository.update(user.id, {
      password: await bcrypt.hash(dto.newPassword, PASSWORD_SALT_ROUNDS),
      firstAccess: false,
      passwordChangedAt: new Date(),
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
    });

    await this.auditService.logAdminAction({
      actorUserId: user.id,
      targetUserId: user.id,
      action: 'PASSWORD_RECOVERY_COMPLETED',
      metadata,
    });

    return this.usersRepository.toPublicUser(updatedUser);
  }

  private generateToken() {
    return randomBytes(32).toString('hex');
  }

  private getPasswordResetExpirationDate() {
    const minutes = this.configService.getOrThrow<number>(
      'PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES',
    );
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private buildPasswordResetLink(token: string) {
    const frontendUrl = this.configService.getOrThrow<string>('APP_FRONTEND_URL');
    const url = new URL(
      '/reset-password',
      frontendUrl.endsWith('/') ? frontendUrl : `${frontendUrl}/`,
    );
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async sendPasswordRecoveryEmail(user: User, token: string, expiresAt: Date) {
    const link = this.buildPasswordResetLink(token);
    const template = renderPasswordResetTemplate({
      actionUrl: link,
      expiresAt,
      token,
      userName: user.name,
    });

    return this.mailService.sendMail({
      attachments: template.attachments,
      from: this.mailService.senderAddress,
      html: template.html,
      subject: template.subject,
      text: template.text,
      to: user.email,
    });
  }

  private getErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown email delivery error';
    return message.replace(/token=[^\s"'&]+/gi, 'token=[redacted]');
  }
}

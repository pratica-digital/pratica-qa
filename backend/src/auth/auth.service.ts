import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuditService, RequestMetadata } from '../audit/audit.service';
import { UsersRepository } from '../modules/users/repositories/users.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordRecoveryDto } from './dto/request-password-recovery.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './types/authenticated-user';

const PASSWORD_SALT_ROUNDS = 12;
const PASSWORD_RESET_EXPIRATION_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
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
    let resetToken: string | undefined;
    let expiresAt: Date | undefined;

    if (user && user.status === UserStatus.ACTIVE && !user.deletedAt) {
      resetToken = randomBytes(32).toString('hex');
      expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000);

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
    }

    return {
      message: 'If the email exists, password reset instructions will be sent.',
      resetToken: process.env.NODE_ENV === 'production' ? undefined : resetToken,
      expiresAt,
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
}

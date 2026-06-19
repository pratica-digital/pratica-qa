import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuditService, RequestMetadata } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { EmailService } from '../../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUser, UsersRepository } from './repositories/users.repository';

const PASSWORD_SALT_ROUNDS = 12;

export type UserEmailNotificationResponse = {
  user: PublicUser;
  message: string;
  token: string;
  link: string;
  emailSent: boolean;
  emailError?: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
    metadata?: RequestMetadata,
  ): Promise<UserEmailNotificationResponse> {
    this.ensureEmail(dto.email);

    const firstAccessToken = this.generateToken();
    const tokenExpiresAt = this.getExpirationDate('FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES', 1440);
    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: await this.hashPassword(this.generateUnusablePassword()),
      role: dto.role ?? UserRole.QA,
      status: dto.status ?? UserStatus.ACTIVE,
      firstAccess: true,
      passwordChangedAt: null,
      passwordResetTokenHash: await this.hashPassword(firstAccessToken),
      passwordResetTokenExpiresAt: tokenExpiresAt,
    });

    await this.auditService.logAdminAction({
      actorUserId: actor.id,
      targetUserId: user.id,
      action: 'USER_CREATED',
      details: {
        email: user.email,
        role: user.role,
        status: user.status,
      },
      metadata,
    });

    await this.auditService.logAdminAction({
      actorUserId: actor.id,
      targetUserId: user.id,
      action: 'USER_FIRST_ACCESS_TOKEN_GENERATED',
      details: {
        email: user.email,
        expiresAt: tokenExpiresAt.toISOString(),
      },
      metadata,
    });

    const firstAccessLink = this.buildPasswordSetupLink(user.email, firstAccessToken);
    let emailSent = false;
    let emailErrorMessage: string | undefined;

    try {
      await this.sendFirstAccessEmail(user, firstAccessToken, tokenExpiresAt);
      emailSent = true;

      await this.auditService.logAdminAction({
        actorUserId: actor.id,
        targetUserId: user.id,
        action: 'USER_FIRST_ACCESS_EMAIL_SENT',
        details: {
          email: user.email,
          expiresAt: tokenExpiresAt.toISOString(),
        },
        metadata,
      });
    } catch (emailError) {
      emailErrorMessage = this.getErrorMessage(emailError);

      await this.auditService.logAdminAction({
        actorUserId: actor.id,
        targetUserId: user.id,
        action: 'USER_FIRST_ACCESS_EMAIL_FAILED',
        details: {
          email: user.email,
          error: emailErrorMessage,
        },
        metadata,
      });
    }

    return {
      user: this.usersRepository.toPublicUser(user),
      message: emailSent
        ? `First access email sent to ${user.email}.`
        : `First access token generated for ${user.email}. Email was not sent.`,
      token: firstAccessToken,
      link: firstAccessLink,
      emailSent,
      emailError: emailErrorMessage,
    };
  }

  async findAll(query: QueryUsersDto) {
    const pagination = getPagination(query);
    const filters = {
      search: query.search,
      role: query.role,
      status: query.status,
    };
    const [users, total] = await Promise.all([
      this.usersRepository.findMany({
        ...filters,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.usersRepository.count(filters),
    ]);

    return {
      data: users.map((user) => this.usersRepository.toPublicUser(user)),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.take,
      },
    };
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.usersRepository.findById(id);

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return this.usersRepository.toPublicUser(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
    metadata?: RequestMetadata,
  ): Promise<PublicUser> {
    await this.findOne(id);

    if (actor.id === id && (dto.status === UserStatus.INACTIVE || dto.role === UserRole.QA || dto.role === UserRole.VIEWER)) {
      throw new BadRequestException('Admins cannot remove their own administrative access');
    }

    const user = await this.usersRepository.update(id, {
      name: dto.name,
      email: dto.email,
      role: dto.role,
      status: dto.status,
    });

    await this.auditService.logAdminAction({
      actorUserId: actor.id,
      targetUserId: id,
      action: 'USER_UPDATED',
      details: {
        changedFields: Object.entries(dto)
          .filter(([, value]) => value !== undefined)
          .map(([key]) => key),
      },
      metadata,
    });

    return this.usersRepository.toPublicUser(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<PublicUser> {
    await this.findOne(id);
    const user = await this.usersRepository.update(id, {
      name: dto.name,
      email: dto.email,
    });

    return this.usersRepository.toPublicUser(user);
  }

  async activate(
    id: string,
    actor: AuthenticatedUser,
    metadata?: RequestMetadata,
  ): Promise<PublicUser> {
    await this.findOne(id);
    const user = await this.usersRepository.update(id, {
      status: UserStatus.ACTIVE,
    });

    await this.auditService.logAdminAction({
      actorUserId: actor.id,
      targetUserId: id,
      action: 'USER_ACTIVATED',
      metadata,
    });

    return this.usersRepository.toPublicUser(user);
  }

  async deactivate(
    id: string,
    actor: AuthenticatedUser,
    metadata?: RequestMetadata,
  ): Promise<PublicUser> {
    await this.findOne(id);

    if (actor.id === id) {
      throw new BadRequestException('Admins cannot deactivate their own account');
    }

    const user = await this.usersRepository.update(id, {
      status: UserStatus.INACTIVE,
    });

    await this.auditService.logAdminAction({
      actorUserId: actor.id,
      targetUserId: id,
      action: 'USER_DEACTIVATED',
      metadata,
    });

    return this.usersRepository.toPublicUser(user);
  }

  async resetPassword(
    id: string,
    actor: AuthenticatedUser,
    metadata?: RequestMetadata,
  ): Promise<UserEmailNotificationResponse> {
    const existingUser = await this.usersRepository.findById(id);

    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundException('User not found');
    }

    this.ensureEmail(existingUser.email);

    const resetToken = this.generateToken();
    const tokenExpiresAt = this.getExpirationDate('PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES', 30);
    const user = await this.usersRepository.update(id, {
      password: await this.hashPassword(this.generateUnusablePassword()),
      firstAccess: true,
      passwordChangedAt: null,
      passwordResetTokenHash: await this.hashPassword(resetToken),
      passwordResetTokenExpiresAt: tokenExpiresAt,
    });

    await this.auditService.logAdminAction({
      actorUserId: actor.id,
      targetUserId: id,
      action: 'USER_PASSWORD_RESET_TOKEN_GENERATED',
      details: {
        email: user.email,
        expiresAt: tokenExpiresAt.toISOString(),
      },
      metadata,
    });

    const resetLink = this.buildPasswordSetupLink(user.email, resetToken);
    let emailSent = false;
    let emailErrorMessage: string | undefined;

    try {
      await this.sendPasswordResetEmail(user, resetToken, tokenExpiresAt);
      emailSent = true;

      await this.auditService.logAdminAction({
        actorUserId: actor.id,
        targetUserId: id,
        action: 'USER_PASSWORD_RESET_EMAIL_SENT',
        details: {
          email: user.email,
          expiresAt: tokenExpiresAt.toISOString(),
        },
        metadata,
      });
    } catch (emailError) {
      emailErrorMessage = this.getErrorMessage(emailError);

      await this.auditService.logAdminAction({
        actorUserId: actor.id,
        targetUserId: id,
        action: 'USER_PASSWORD_RESET_EMAIL_FAILED',
        details: {
          email: user.email,
          error: emailErrorMessage,
        },
        metadata,
      });
    }

    return {
      user: this.usersRepository.toPublicUser(user),
      message: emailSent
        ? `Password reset email sent to ${user.email}.`
        : `Password reset token generated for ${user.email}. Email was not sent.`,
      token: resetToken,
      link: resetLink,
      emailSent,
      emailError: emailErrorMessage,
    };
  }

  async remove(
    id: string,
    actor: AuthenticatedUser,
    metadata?: RequestMetadata,
  ): Promise<PublicUser> {
    await this.findOne(id);

    if (actor.id === id) {
      throw new BadRequestException('Admins cannot delete their own account');
    }

    const user = await this.usersRepository.delete(id);

    await this.auditService.logAdminAction({
      actorUserId: actor.id,
      targetUserId: id,
      action: 'USER_DELETED',
      metadata,
    });

    return this.usersRepository.toPublicUser(user);
  }

  private hashPassword(password: string) {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }

  private generateToken() {
    return randomBytes(32).toString('hex');
  }

  private generateUnusablePassword() {
    return randomBytes(48).toString('hex');
  }

  private getExpirationDate(configKey: string, fallbackMinutes: number) {
    const minutes = this.configService.get<number>(configKey, fallbackMinutes);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private buildPasswordSetupLink(email: string, token: string) {
    const url = new URL(this.configService.get<string>('APP_FRONTEND_URL', 'http://localhost:5173'));
    url.searchParams.set('mode', 'reset');
    url.searchParams.set('email', email);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async sendFirstAccessEmail(user: User, token: string, expiresAt: Date) {
    const link = this.buildPasswordSetupLink(user.email, token);

    await this.emailService.send({
      to: user.email,
      subject: 'Sua conta na QA Platform foi criada',
      text: [
        `Olá, ${user.name}.`,
        '',
        'Uma conta foi criada para você na QA Platform.',
        '',
        'Use o link abaixo para concluir o primeiro acesso e definir sua senha inicial:',
        link,
        '',
        `Token de primeiro acesso: ${token}`,
        `Validade: ${expiresAt.toLocaleString('pt-BR')}`,
        '',
        'Se você não esperava esse convite, ignore este e-mail e avise o administrador.',
      ].join('\n'),
    });
  }

  private async sendPasswordResetEmail(user: User, token: string, expiresAt: Date) {
    const link = this.buildPasswordSetupLink(user.email, token);

    await this.emailService.send({
      to: user.email,
      subject: 'Redefinição de senha da QA Platform',
      text: [
        `Olá, ${user.name}.`,
        '',
        'Um administrador solicitou a redefinição da sua senha na QA Platform.',
        '',
        'Use o link abaixo para criar uma nova senha:',
        link,
        '',
        `Token de redefinição: ${token}`,
        `Validade: ${expiresAt.toLocaleString('pt-BR')}`,
        '',
        'Após a criação da nova senha, este token será invalidado automaticamente.',
      ].join('\n'),
    });
  }

  private ensureEmail(email: string | null | undefined) {
    if (!email?.trim()) {
      throw new BadRequestException('User must have an email address before a token can be generated');
    }
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown email delivery error';
  }
}

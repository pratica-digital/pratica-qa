import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { AuditService, RequestMetadata } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUser, UsersRepository } from './repositories/users.repository';

const PASSWORD_SALT_ROUNDS = 12;

export type TemporaryPasswordResponse = {
  user: PublicUser;
  temporaryPassword: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
    metadata?: RequestMetadata,
  ): Promise<TemporaryPasswordResponse> {
    const temporaryPassword = this.generateTemporaryPassword();
    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: await this.hashPassword(temporaryPassword),
      role: dto.role ?? UserRole.QA,
      status: dto.status ?? UserStatus.ACTIVE,
      firstAccess: true,
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

    return {
      user: this.usersRepository.toPublicUser(user),
      temporaryPassword,
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
  ): Promise<TemporaryPasswordResponse> {
    await this.findOne(id);
    const temporaryPassword = this.generateTemporaryPassword();
    const user = await this.usersRepository.update(id, {
      password: await this.hashPassword(temporaryPassword),
      firstAccess: true,
      passwordChangedAt: null,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
    });

    await this.auditService.logAdminAction({
      actorUserId: actor.id,
      targetUserId: id,
      action: 'USER_PASSWORD_RESET',
      metadata,
    });

    return {
      user: this.usersRepository.toPublicUser(user),
      temporaryPassword,
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

  private generateTemporaryPassword() {
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const all = lower + upper + digits;
    const chars = [
      lower[randomInt(lower.length)],
      upper[randomInt(upper.length)],
      digits[randomInt(digits.length)],
    ];

    while (chars.length < 12) {
      chars.push(all[randomInt(all.length)]);
    }

    for (let index = chars.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
    }

    return chars.join('');
  }
}

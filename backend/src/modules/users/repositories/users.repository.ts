import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type FindUsersParams = {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  skip: number;
  take: number;
};

export type PublicUser = Omit<User, 'password' | 'passwordResetTokenHash' | 'passwordResetTokenExpiresAt'>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      firstAccess: user.firstAccess,
      passwordChangedAt: user.passwordChangedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  findMany(params: FindUsersParams) {
    return this.prisma.user.findMany({
      where: this.buildWhere(params),
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(params: Omit<FindUsersParams, 'skip' | 'take'>) {
    return this.prisma.user.count({
      where: this.buildWhere(params),
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.INACTIVE,
      },
    });
  }

  private buildWhere(params: Omit<FindUsersParams, 'skip' | 'take'>): Prisma.UserWhereInput {
    return {
      role: params.role,
      status: params.status,
      deletedAt: null,
      OR: params.search
        ? [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
  }
}

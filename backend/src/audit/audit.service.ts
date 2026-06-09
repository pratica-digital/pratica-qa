import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logLogin(params: {
    userId?: string;
    email: string;
    success: boolean;
    failureReason?: string;
    metadata?: RequestMetadata;
  }) {
    await this.prisma.loginLog
      .create({
        data: {
          userId: params.userId,
          email: params.email,
          success: params.success,
          failureReason: params.failureReason ?? '',
          ipAddress: params.metadata?.ipAddress ?? '',
          userAgent: params.metadata?.userAgent ?? '',
        },
      })
      .catch(() => undefined);
  }

  async logAdminAction(params: {
    actorUserId?: string;
    targetUserId?: string;
    action: string;
    details?: Prisma.InputJsonValue;
    metadata?: RequestMetadata;
  }) {
    await this.prisma.auditLog
      .create({
        data: {
          actorUserId: params.actorUserId,
          targetUserId: params.targetUserId,
          action: params.action,
          details: params.details,
          ipAddress: params.metadata?.ipAddress ?? '',
          userAgent: params.metadata?.userAgent ?? '',
        },
      })
      .catch(() => undefined);
  }
}

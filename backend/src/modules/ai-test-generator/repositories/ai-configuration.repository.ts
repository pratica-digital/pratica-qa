import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type AiConfigurationRecord = {
  id: string;
  provider: string;
  model: string;
  endpoint: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  retries: number;
  streaming: boolean;
  promptBase: string;
  promptUser: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AiConfigurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDefault() {
    return this.prisma.aiConfiguration.findUnique({
      where: { id: 'default' },
    }) as Promise<AiConfigurationRecord | null>;
  }

  upsertDefault(data: Omit<AiConfigurationRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.prisma.aiConfiguration.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...data,
      },
      update: data,
    }) as Promise<AiConfigurationRecord>;
  }
}

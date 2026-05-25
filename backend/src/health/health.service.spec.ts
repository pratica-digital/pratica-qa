import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok when the database responds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ health_check: 1 }]),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.check()).resolves.toMatchObject({
      status: 'ok',
      database: 'ok',
    });
  });

  it('throws unavailable when the database check fails', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

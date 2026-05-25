import { Injectable } from '@nestjs/common';
import { Prisma, TestResultStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTestResultDto } from '../dto/create-test-result.dto';
import { UpdateTestResultDto } from '../dto/update-test-result.dto';

const TEST_RESULT_INCLUDE = {
  testRun: {
    select: {
      id: true,
      name: true,
      status: true,
      testPlanId: true,
    },
  },
  testCase: {
    select: {
      id: true,
      title: true,
      suiteId: true,
      priority: true,
    },
  },
} satisfies Prisma.TestResultInclude;

type FindTestResultsParams = {
  testRunId?: string;
  testCaseId?: string;
  status?: TestResultStatus;
  skip: number;
  take: number;
};

@Injectable()
export class TestResultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTestResultDto) {
    const status = dto.status ?? TestResultStatus.PENDING;

    return this.prisma.testResult.create({
      data: {
        testRunId: dto.testRunId,
        testCaseId: dto.testCaseId,
        executedById: dto.executedById,
        status,
        comment: dto.comment ?? '',
        attachments: dto.attachments ?? [],
        executedAt: status === TestResultStatus.PENDING ? undefined : new Date(),
      },
      include: TEST_RESULT_INCLUDE,
    });
  }

  findMany(params: FindTestResultsParams) {
    return this.prisma.testResult.findMany({
      where: this.buildWhere(params),
      skip: params.skip,
      take: params.take,
      orderBy: [{ executedAt: 'desc' }, { createdAt: 'asc' }],
      include: TEST_RESULT_INCLUDE,
    });
  }

  count(params: Omit<FindTestResultsParams, 'skip' | 'take'>) {
    return this.prisma.testResult.count({
      where: this.buildWhere(params),
    });
  }

  findById(id: string) {
    return this.prisma.testResult.findUnique({
      where: { id },
      include: TEST_RESULT_INCLUDE,
    });
  }

  update(id: string, dto: UpdateTestResultDto) {
    const shouldSetExecutedAt = dto.status && dto.status !== TestResultStatus.PENDING;

    return this.prisma.testResult.update({
      where: { id },
      data: {
        executedById: dto.executedById,
        status: dto.status,
        comment: dto.comment,
        attachments: dto.attachments,
        executedAt: shouldSetExecutedAt ? new Date() : undefined,
      },
      include: TEST_RESULT_INCLUDE,
    });
  }

  async addAttachments(id: string, attachments: string[]) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    return this.prisma.testResult.update({
      where: { id },
      data: {
        attachments: [...current.attachments, ...attachments],
      },
      include: TEST_RESULT_INCLUDE,
    });
  }

  delete(id: string) {
    return this.prisma.testResult.delete({
      where: { id },
    });
  }

  private buildWhere(
    params: Omit<FindTestResultsParams, 'skip' | 'take'>,
  ): Prisma.TestResultWhereInput {
    return {
      testRunId: params.testRunId,
      testCaseId: params.testCaseId,
      status: params.status,
    };
  }
}

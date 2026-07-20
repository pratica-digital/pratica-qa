import { Injectable } from '@nestjs/common';
import { Prisma, TestCaseStatus, TestSeverity } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BulkUpdateTestCasesDto } from '../dto/bulk-update-test-cases.dto';
import { CloneTestCaseDto } from '../dto/clone-test-case.dto';
import { CreateTestCaseDto } from '../dto/create-test-case.dto';
import { CreateTestStepDto } from '../dto/create-test-step.dto';
import { ReplaceTestStepsDto } from '../dto/replace-test-steps.dto';
import { UpdateTestCaseDto } from '../dto/update-test-case.dto';

const TEST_CASE_INCLUDE = {
  suite: {
    select: {
      id: true,
      name: true,
      projects: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  },
  steps: {
    orderBy: {
      order: 'asc',
    },
  },
} satisfies Prisma.TestCaseInclude;

type FindTestCasesParams = {
  suiteId?: string;
  projectId?: string;
  search?: string;
  tag?: string;
  status?: TestCaseStatus;
  severity?: TestSeverity;
  skip: number;
  take: number;
};

@Injectable()
export class TestCasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTestCaseDto) {
    return this.prisma.$transaction(async (tx) => {
      const lastCase = await tx.testCase.aggregate({
        where: { suiteId: dto.suiteId },
        _max: { position: true },
      });

      return tx.testCase.create({
        data: {
          suiteId: dto.suiteId,
          position: (lastCase._max.position ?? 0) + 1,
          title: dto.title,
          description: dto.description ?? '',
          preconditions: dto.preconditions ?? '',
          expectedResult: dto.expectedResult ?? '',
          section: dto.section ?? '',
          status: dto.status,
          priority: dto.priority,
          severity: dto.severity,
          tags: dto.tags ?? [],
          steps: this.toNestedSteps(dto.steps),
        },
        include: TEST_CASE_INCLUDE,
      });
    });
  }

  findMany(params: FindTestCasesParams) {
    return this.prisma.testCase.findMany({
      where: this.buildWhere(params),
      skip: params.skip,
      take: params.take,
      orderBy: [{ suite: { position: 'asc' } }, { position: 'asc' }, { id: 'asc' }],
      include: TEST_CASE_INCLUDE,
    });
  }

  count(params: Omit<FindTestCasesParams, 'skip' | 'take'>) {
    return this.prisma.testCase.count({
      where: this.buildWhere(params),
    });
  }

  findById(id: string) {
    return this.prisma.testCase.findFirst({
      where: {
        id,
        deletedAt: null,
        suite: { deletedAt: null },
      },
      include: TEST_CASE_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateTestCaseDto) {
    const shouldIncrementVersion = Object.keys(dto).length > 0;

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.testCase.findUniqueOrThrow({ where: { id } });
      let position: number | undefined;

      if (dto.suiteId && dto.suiteId !== current.suiteId) {
        const lastCase = await tx.testCase.aggregate({
          where: { suiteId: dto.suiteId },
          _max: { position: true },
        });
        position = (lastCase._max.position ?? 0) + 1;
      }

      return tx.testCase.update({
        where: { id },
        data: {
          suiteId: dto.suiteId,
          position,
          title: dto.title,
          description: dto.description,
          preconditions: dto.preconditions,
          expectedResult: dto.expectedResult,
          section: dto.section,
          status: dto.status,
          priority: dto.priority,
          severity: dto.severity,
          tags: dto.tags,
          version: shouldIncrementVersion ? { increment: 1 } : undefined,
        },
        include: TEST_CASE_INCLUDE,
      });
    });
  }

  async replaceSteps(id: string, dto: ReplaceTestStepsDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.testStep.deleteMany({
        where: { testCaseId: id },
      });

      if (dto.steps.length > 0) {
        await tx.testStep.createMany({
          data: this.toStepRows(id, dto.steps),
        });
      }

      await tx.testCase.update({
        where: { id },
        data: { version: { increment: 1 } },
      });

      return tx.testCase.findUnique({
        where: { id },
        include: TEST_CASE_INCLUDE,
      });
    });
  }

  async clone(id: string, dto: CloneTestCaseDto) {
    const source = await this.findById(id);

    if (!source) {
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      const suiteId = dto.suiteId ?? source.suiteId;
      const lastCase = await tx.testCase.aggregate({
        where: { suiteId },
        _max: { position: true },
      });

      return tx.testCase.create({
        data: {
          suiteId,
          position: (lastCase._max.position ?? 0) + 1,
          clonedFromId: source.id,
          title: dto.title ?? `${source.title} (copy)`,
          description: source.description,
          preconditions: source.preconditions,
          expectedResult: source.expectedResult,
          section: source.section,
          status: source.status,
          priority: source.priority,
          severity: source.severity,
          tags: source.tags,
          steps: {
            create: source.steps.map((step) => ({
              order: step.order,
              description: step.description,
              expectedResult: step.expectedResult,
            })),
          },
        },
        include: TEST_CASE_INCLUDE,
      });
    });
  }

  async bulkUpdateStatus(dto: BulkUpdateTestCasesDto) {
    await this.prisma.testCase.updateMany({
      where: {
        id: { in: dto.ids },
      },
      data: {
        status: dto.status,
        version: { increment: 1 },
      },
    });

    return this.prisma.testCase.findMany({
      where: {
        id: { in: dto.ids },
      },
      include: TEST_CASE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  delete(id: string) {
    return this.prisma.testCase.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: TestCaseStatus.ARCHIVED,
      },
    });
  }

  private buildWhere(
    params: Omit<FindTestCasesParams, 'skip' | 'take'>,
  ): Prisma.TestCaseWhereInput {
    return {
      suiteId: params.suiteId,
      deletedAt: null,
      suite: {
        deletedAt: null,
        ...(params.projectId
          ? {
              OR: [
                { projects: { some: { id: params.projectId, deletedAt: null } } },
                { projects: { none: {} } },
              ],
            }
          : {}),
      },
      status: params.status,
      severity: params.severity,
      tags: params.tag ? { has: params.tag } : undefined,
      OR: params.search
        ? [
            { title: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
            { section: { contains: params.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
  }

  private toNestedSteps(
    steps?: CreateTestStepDto[],
  ): Prisma.TestStepCreateNestedManyWithoutTestCaseInput | undefined {
    if (!steps || steps.length === 0) {
      return undefined;
    }

    return {
      create: steps.map((step, index) => ({
        order: step.order ?? index + 1,
        description: step.description,
        expectedResult: step.expectedResult,
      })),
    };
  }

  private toStepRows(testCaseId: string, steps: CreateTestStepDto[]) {
    return steps.map((step, index) => ({
      testCaseId,
      order: step.order ?? index + 1,
      description: step.description,
      expectedResult: step.expectedResult,
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma, TestCaseStatus, TestResultStatus, TestRunStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTestRunDto } from '../dto/create-test-run.dto';
import { ExecuteTestRunDto } from '../dto/execute-test-run.dto';
import { RerunFailedTestsDto } from '../dto/rerun-failed-tests.dto';
import { UpdateTestRunDto } from '../dto/update-test-run.dto';

const TEST_RUN_INCLUDE = {
  project: {
    select: {
      id: true,
      key: true,
      name: true,
    },
  },
  testPlan: {
    select: {
      id: true,
      name: true,
      version: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  suites: {
    orderBy: {
      position: 'asc',
    },
    include: {
      testSuite: {
        select: {
          id: true,
          name: true,
          projectId: true,
        },
      },
    },
  },
  results: {
    include: {
      testCase: {
        select: {
          id: true,
          title: true,
          suiteId: true,
          priority: true,
          status: true,
          steps: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.TestRunInclude;

type FindTestRunsParams = {
  projectId?: string;
  testPlanId?: string;
  search?: string;
  status?: TestRunStatus;
  skip: number;
  take: number;
};

@Injectable()
export class TestRunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTestRunDto, suiteIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const testCases = await tx.testCase.findMany({
        where: {
          suiteId: { in: suiteIds },
          status: TestCaseStatus.ACTIVE,
          deletedAt: null,
          suite: {
            deletedAt: null,
          },
        },
        select: { id: true },
        orderBy: [{ suiteId: 'asc' }, { title: 'asc' }],
      });

      const testRun = await tx.testRun.create({
        data: {
          projectId: dto.projectId,
          testPlanId: dto.testPlanId,
          createdById: dto.createdById,
          assignedToId: dto.assignedToId,
          name: dto.name,
          description: dto.description ?? '',
          suites: {
            create: suiteIds.map((suiteId, index) => ({
              testSuiteId: suiteId,
              position: index + 1,
            })),
          },
        },
      });

      if (testCases.length > 0) {
        await tx.testResult.createMany({
          data: testCases.map((testCase) => ({
            testRunId: testRun.id,
            testCaseId: testCase.id,
            status: TestResultStatus.PENDING,
          })),
        });
      }

      return tx.testRun.findUnique({
        where: { id: testRun.id },
        include: TEST_RUN_INCLUDE,
      });
    });
  }

  assign(id: string, assignedToId: string) {
    return this.prisma.testRun.update({
      where: { id },
      data: { assignedToId },
      include: TEST_RUN_INCLUDE,
    });
  }

  findMany(params: FindTestRunsParams) {
    return this.prisma.testRun.findMany({
      where: this.buildWhere(params),
      skip: params.skip,
      take: params.take,
      orderBy: { updatedAt: 'desc' },
      include: TEST_RUN_INCLUDE,
    });
  }

  count(params: Omit<FindTestRunsParams, 'skip' | 'take'>) {
    return this.prisma.testRun.count({
      where: this.buildWhere(params),
    });
  }

  findById(id: string) {
    return this.prisma.testRun.findUnique({
      where: { id },
      include: TEST_RUN_INCLUDE,
    });
  }

  update(id: string, dto: UpdateTestRunDto) {
    return this.prisma.testRun.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: TEST_RUN_INCLUDE,
    });
  }

  async start(id: string) {
    await this.prisma.testRun.update({
      where: { id },
      data: {
        startedAt: new Date(),
      },
    });

    return this.refreshExecutionStatus(id);
  }

  complete(id: string) {
    return this.refreshExecutionStatus(id);
  }

  async rerunFailed(sourceRunId: string, dto: RerunFailedTestsDto) {
    const failedResults = await this.prisma.testResult.findMany({
      where: {
        testRunId: sourceRunId,
        status: TestResultStatus.FAILED,
      },
      select: { id: true },
    });

    if (failedResults.length === 0) {
      return { testRun: null, failedCount: 0 };
    }

    const failedResultIds = failedResults.map((result) => result.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.testResult.updateMany({
        where: { id: { in: failedResultIds } },
        data: {
          status: TestResultStatus.PENDING,
          executedById: null,
          executedAt: null,
          comment: '',
          attachments: [],
        },
      });

      if (dto.name !== undefined || dto.description !== undefined) {
        await tx.testRun.update({
          where: { id: sourceRunId },
          data: {
            name: dto.name,
            description: dto.description,
          },
        });
      }
    });

    return {
      testRun: await this.refreshExecutionStatus(sourceRunId),
      failedCount: failedResults.length,
    };
  }

  async executeResult(testRunId: string, dto: ExecuteTestRunDto, executedById: string) {
    const testResult = await this.prisma.testResult.findFirst({
      where: {
        id: dto.testResultId,
        testRunId,
        testCaseId: dto.testCaseId,
      },
    });

    if (!testResult) {
      return null;
    }

    const updatedResult = await this.prisma.testResult.update({
      where: { id: testResult.id },
      data: {
        status: dto.status,
        comment: dto.comment,
        attachments: dto.attachments,
        executedById,
        executedAt: new Date(),
      },
    });

    await this.refreshExecutionStatus(testRunId);

    return this.prisma.testResult.findUnique({
      where: { id: updatedResult.id },
      include: {
        testRun: {
          select: {
            id: true,
            name: true,
            status: true,
            completedAt: true,
            assignedToId: true,
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
        executedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async refreshExecutionStatus(testRunId: string) {
    const [currentRun, totalCaseGroups, executedCaseGroups] = await Promise.all([
      this.prisma.testRun.findUnique({
        where: { id: testRunId },
        select: {
          status: true,
          completedAt: true,
        },
      }),
      this.prisma.testResult.groupBy({
        by: ['testCaseId'],
        where: { testRunId },
      }),
      this.prisma.testResult.groupBy({
        by: ['testCaseId'],
        where: {
          testRunId,
          status: { not: TestResultStatus.PENDING },
        },
      }),
    ]);

    if (!currentRun) {
      return null;
    }

    const totalTestCases = totalCaseGroups.length;
    const resultsCount = executedCaseGroups.length;
    const status =
      resultsCount === 0
        ? TestRunStatus.PENDING
        : resultsCount < totalTestCases
          ? TestRunStatus.IN_PROGRESS
          : TestRunStatus.COMPLETED;

    return this.prisma.testRun.update({
      where: { id: testRunId },
      data: {
        status,
        completedAt:
          status === TestRunStatus.COMPLETED
            ? currentRun.status === TestRunStatus.COMPLETED && currentRun.completedAt
              ? currentRun.completedAt
              : new Date()
            : null,
      },
      include: TEST_RUN_INCLUDE,
    });
  }

  delete(id: string) {
    return this.prisma.testRun.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private buildWhere(params: Omit<FindTestRunsParams, 'skip' | 'take'>): Prisma.TestRunWhereInput {
    return {
      projectId: params.projectId,
      testPlanId: params.testPlanId,
      status: params.status,
      deletedAt: null,
      OR: params.search
        ? [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
  }
}

import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TestCaseStatus,
  TestResultStatus,
  TestRunStatus,
  TestRunTestType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTestRunDto } from '../dto/create-test-run.dto';
import { ExecuteTestRunDto } from '../dto/execute-test-run.dto';
import { RerunFailedTestsDto } from '../dto/rerun-failed-tests.dto';
import { UpdateTestRunDto } from '../dto/update-test-run.dto';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

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
    },
  },
  results: {
    where: {
      removedAt: null,
    },
    include: {
      testCase: {
        select: {
          id: true,
          title: true,
          suiteId: true,
          position: true,
          description: true,
          expectedResult: true,
          priority: true,
          severity: true,
          status: true,
          steps: {
            orderBy: {
              order: 'asc',
            },
          },
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
        },
      },
      executedBy: {
        select: USER_PUBLIC_SELECT,
      },
      lastModifiedBy: {
        select: USER_PUBLIC_SELECT,
      },
      attachments: {
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          uploadedBy: {
            select: USER_PUBLIC_SELECT,
          },
          testStep: {
            select: {
              id: true,
              order: true,
              description: true,
              expectedResult: true,
            },
          },
        },
      },
      history: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          actor: {
            select: USER_PUBLIC_SELECT,
          },
        },
      },
    },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
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

type SuiteAssignment = {
  suiteId: string;
  testType: TestRunTestType;
};

export type SelectableTestCase = {
  id: string;
  position: number;
  suiteId: string;
  suitePosition: number;
};

export type AddTestRunTestsResult = {
  addedCount: number;
  addedTestCaseIds: string[];
  ignoredDuplicateCount: number;
  ignoredTestCaseIds: string[];
  newTotal: number;
  previousTotal: number;
  status: 'ADDED' | 'RUN_NOT_EDITABLE' | 'RUN_NOT_FOUND';
};

@Injectable()
export class TestRunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTestRunDto, suiteAssignments: SuiteAssignment[]) {
    const suiteIds = suiteAssignments.map((assignment) => assignment.suiteId);

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
        select: { id: true, position: true, suiteId: true },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      });

      const suitePositionById = new Map(
        suiteAssignments.map((assignment, index) => [assignment.suiteId, index]),
      );
      const orderedTestCases = [...testCases].sort((left, right) => {
        const suiteDifference =
          (suitePositionById.get(left.suiteId) ?? Number.MAX_SAFE_INTEGER) -
          (suitePositionById.get(right.suiteId) ?? Number.MAX_SAFE_INTEGER);

        return suiteDifference || left.position - right.position || left.id.localeCompare(right.id);
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
            create: suiteAssignments.map((assignment, index) => ({
              testSuiteId: assignment.suiteId,
              testType: assignment.testType,
              position: index + 1,
            })),
          },
        },
      });

      if (orderedTestCases.length > 0) {
        await tx.testResult.createMany({
          data: orderedTestCases.map((testCase, index) => ({
            testRunId: testRun.id,
            testCaseId: testCase.id,
            position: index + 1,
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
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
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

  async findSelectableTests(
    testSuiteIds: string[],
    testCaseIds: string[],
    projectId?: string | null,
  ) {
    const suiteProjectFilter = projectId
      ? {
          OR: [
            { projects: { some: { id: projectId, deletedAt: null } } },
            { projects: { none: {} } },
          ],
        }
      : {};
    const [suites, testCases] = await Promise.all([
      this.prisma.testSuite.findMany({
        where: {
          id: { in: testSuiteIds },
          deletedAt: null,
          ...suiteProjectFilter,
        },
        select: { id: true },
      }),
      this.prisma.testCase.findMany({
        where: {
          deletedAt: null,
          status: TestCaseStatus.ACTIVE,
          suite: {
            deletedAt: null,
            ...suiteProjectFilter,
          },
          OR: [
            ...(testSuiteIds.length > 0 ? [{ suiteId: { in: testSuiteIds } }] : []),
            ...(testCaseIds.length > 0 ? [{ id: { in: testCaseIds } }] : []),
          ],
        },
        select: {
          id: true,
          position: true,
          suiteId: true,
          suite: { select: { position: true } },
        },
      }),
    ]);

    return {
      suiteIds: suites.map((suite) => suite.id),
      testCases: testCases
        .map((testCase) => ({
          id: testCase.id,
          position: testCase.position,
          suiteId: testCase.suiteId,
          suitePosition: testCase.suite.position,
        }))
        .sort(
          (left, right) =>
            left.suitePosition - right.suitePosition ||
            left.position - right.position ||
            left.id.localeCompare(right.id),
        ),
    };
  }

  async addTests(
    testRunId: string,
    requestedCases: SelectableTestCase[],
    requestedSuiteIds: string[],
    actorUserId: string,
  ): Promise<AddTestRunTestsResult> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const testRun = await tx.testRun.findUnique({
              where: { id: testRunId },
              select: { deletedAt: true, status: true },
            });

            if (!testRun || testRun.deletedAt) {
              return {
                status: 'RUN_NOT_FOUND',
                previousTotal: 0,
                newTotal: 0,
                addedCount: 0,
                ignoredDuplicateCount: 0,
                addedTestCaseIds: [],
                ignoredTestCaseIds: [],
              };
            }

            const previousTotal = await tx.testResult.count({
              where: { testRunId, removedAt: null },
            });

            if (testRun.status === TestRunStatus.COMPLETED) {
              return {
                status: 'RUN_NOT_EDITABLE',
                previousTotal,
                newTotal: previousTotal,
                addedCount: 0,
                ignoredDuplicateCount: 0,
                addedTestCaseIds: [],
                ignoredTestCaseIds: [],
              };
            }

            const requestedCaseIds = requestedCases.map((testCase) => testCase.id);
            const existingResults = await tx.testResult.findMany({
              where: { testRunId, testCaseId: { in: requestedCaseIds } },
              select: { testCaseId: true },
            });
            const existingCaseIds = new Set(existingResults.map((result) => result.testCaseId));
            const newCases = requestedCases.filter((testCase) => !existingCaseIds.has(testCase.id));
            const relatedSuiteIds = [...new Set(newCases.map((testCase) => testCase.suiteId))];
            const existingRunSuites = await tx.testRunSuite.findMany({
              where: { testRunId },
              orderBy: [{ position: 'asc' }, { id: 'asc' }],
              select: { position: true, testSuiteId: true },
            });
            const existingRunSuiteIds = new Set(
              existingRunSuites.map((suite) => suite.testSuiteId),
            );
            const newSuiteIds = relatedSuiteIds.filter(
              (suiteId) => !existingRunSuiteIds.has(suiteId),
            );
            const lastSuitePosition = existingRunSuites.at(-1)?.position ?? 0;

            if (newSuiteIds.length > 0) {
              await tx.testRunSuite.createMany({
                data: newSuiteIds.map((suiteId, index) => ({
                  position: lastSuitePosition + index + 1,
                  testRunId,
                  testSuiteId: suiteId,
                  testType: TestRunTestType.FUNCIONAL,
                })),
                skipDuplicates: true,
              });
            }

            const lastResult = await tx.testResult.aggregate({
              where: { testRunId },
              _max: { position: true },
            });
            const firstPosition = (lastResult._max.position ?? 0) + 1;
            const createdResults =
              newCases.length === 0
                ? []
                : await tx.testResult.createManyAndReturn({
                    data: newCases.map((testCase, index) => ({
                      position: firstPosition + index,
                      status: TestResultStatus.PENDING,
                      testCaseId: testCase.id,
                      testRunId,
                    })),
                    select: { testCaseId: true },
                    skipDuplicates: true,
                  });
            const addedTestCaseIds = createdResults.map((result) => result.testCaseId);
            const addedTestCaseIdSet = new Set(addedTestCaseIds);
            const addedTestSuiteIds = [
              ...new Set(
                requestedCases
                  .filter((testCase) => addedTestCaseIdSet.has(testCase.id))
                  .map((testCase) => testCase.suiteId),
              ),
            ];
            const ignoredTestCaseIds = requestedCaseIds.filter(
              (testCaseId) => !addedTestCaseIdSet.has(testCaseId),
            );
            const newTotal = await tx.testResult.count({
              where: { testRunId, removedAt: null },
            });

            if (addedTestCaseIds.length > 0) {
              await tx.testRun.update({
                where: { id: testRunId },
                data: { updatedAt: new Date() },
              });
              await tx.auditLog.create({
                data: {
                  action: 'TEST_RUN_TESTS_ADDED',
                  actorUserId,
                  details: {
                    addedTestCaseIds,
                    addedTestSuiteIds,
                    newTotal,
                    previousTotal,
                    requestedTestSuiteIds: requestedSuiteIds,
                    testRunId,
                  },
                },
              });
            }

            return {
              status: 'ADDED',
              previousTotal,
              addedCount: addedTestCaseIds.length,
              ignoredDuplicateCount: ignoredTestCaseIds.length,
              newTotal,
              addedTestCaseIds,
              ignoredTestCaseIds,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if ((error as { code?: string }).code === 'P2034' && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Unable to add tests after retrying the transaction');
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
        removedAt: null,
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
          lastModifiedById: null,
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
        removedAt: null,
      },
    });

    if (!testResult) {
      return null;
    }

    const nextComment = dto.comment ?? testResult.comment;
    const changed = testResult.status !== dto.status || testResult.comment !== nextComment;

    const updatedResult = await this.prisma.testResult.update({
      where: { id: testResult.id },
      data: {
        status: dto.status,
        comment: dto.comment,
        executedById: dto.status === TestResultStatus.PENDING ? null : executedById,
        lastModifiedById: executedById,
        executedAt: dto.status === TestResultStatus.PENDING ? null : new Date(),
      },
    });

    if (changed) {
      await this.prisma.testResultHistory.create({
        data: {
          testResultId: testResult.id,
          actorUserId: executedById,
          previousStatus: testResult.status,
          newStatus: dto.status,
          previousComment: testResult.comment,
          newComment: nextComment,
        },
      });
    }

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
            updatedAt: true,
            assignedToId: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        testCase: {
          select: {
            id: true,
            title: true,
            suiteId: true,
            description: true,
            expectedResult: true,
            priority: true,
            severity: true,
            status: true,
            steps: {
              orderBy: {
                order: 'asc',
              },
            },
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
          },
        },
        executedBy: {
          select: USER_PUBLIC_SELECT,
        },
        lastModifiedBy: {
          select: USER_PUBLIC_SELECT,
        },
        attachments: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            uploadedBy: {
              select: USER_PUBLIC_SELECT,
            },
            testStep: {
              select: {
                id: true,
                order: true,
                description: true,
                expectedResult: true,
              },
            },
          },
        },
        history: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            actor: {
              select: USER_PUBLIC_SELECT,
            },
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
        where: { testRunId, removedAt: null },
      }),
      this.prisma.testResult.groupBy({
        by: ['testCaseId'],
        where: {
          testRunId,
          removedAt: null,
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

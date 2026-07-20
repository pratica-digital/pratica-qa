import { Injectable } from '@nestjs/common';
import { Prisma, TestResultStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTestResultDto } from '../dto/create-test-result.dto';
import { PersistedTestResultAttachmentInput } from '../test-result-attachment-upload';
import { UpdateTestResultDto } from '../dto/update-test-result.dto';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

const TEST_RESULT_INCLUDE = {
  testRun: {
    select: {
      id: true,
      name: true,
      status: true,
      completedAt: true,
      updatedAt: true,
      testPlanId: true,
      projectId: true,
      assignedToId: true,
      deletedAt: true,
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
          projectId: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
  executedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
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
} satisfies Prisma.TestResultInclude;

type UpdateTestResultInput = UpdateTestResultDto & {
  lastModifiedById?: string;
};

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

    const executedAt = status === TestResultStatus.PENDING ? null : new Date();

    return this.prisma.testResult.upsert({
      where: {
        testRunId_testCaseId: {
          testRunId: dto.testRunId,
          testCaseId: dto.testCaseId,
        },
      },
      create: {
        testRunId: dto.testRunId,
        testCaseId: dto.testCaseId,
        executedById: dto.executedById,
        lastModifiedById: dto.executedById,
        status,
        comment: dto.comment ?? '',
        executedAt,
      },
      update: {
        executedById: dto.executedById,
        lastModifiedById: dto.executedById,
        status,
        comment: dto.comment ?? '',
        executedAt,
      },
      include: TEST_RESULT_INCLUDE,
    });
  }

  findMany(params: FindTestResultsParams) {
    return this.prisma.testResult.findMany({
      where: this.buildWhere(params),
      skip: params.skip,
      take: params.take,
      orderBy: [{ executedAt: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      include: TEST_RESULT_INCLUDE,
    });
  }

  count(params: Omit<FindTestResultsParams, 'skip' | 'take'>) {
    return this.prisma.testResult.count({
      where: this.buildWhere(params),
    });
  }

  findById(id: string) {
    return this.prisma.testResult.findFirst({
      where: {
        id,
        removedAt: null,
        testRun: { deletedAt: null },
      },
      include: TEST_RESULT_INCLUDE,
    });
  }

  findAttachmentById(id: string) {
    return this.prisma.testResultAttachment.findFirst({
      where: {
        id,
        testResult: {
          removedAt: null,
          testRun: { deletedAt: null },
        },
      },
    });
  }

  update(id: string, dto: UpdateTestResultInput) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.testResult.findUnique({
        where: { id },
        select: {
          comment: true,
          executedAt: true,
          executedById: true,
          status: true,
        },
      });

      if (!current) {
        return null;
      }

      const nextStatus = dto.status ?? current.status;
      const nextComment = dto.comment ?? current.comment;
      const isMovingToNotRun = dto.status === TestResultStatus.PENDING;
      const isMovingToExecuted =
        dto.status !== undefined && dto.status !== TestResultStatus.PENDING;
      const executedById = isMovingToNotRun
        ? null
        : current.executedById ?? dto.executedById;
      const executedAt = isMovingToNotRun
        ? null
        : isMovingToExecuted && !current.executedAt
          ? new Date()
          : undefined;

      const changed =
        current.status !== nextStatus ||
        current.comment !== nextComment;

      const updated = await tx.testResult.update({
        where: { id },
        data: {
          executedById,
          lastModifiedById: dto.lastModifiedById,
          status: dto.status,
          comment: dto.comment,
          titleOverride: dto.title,
          descriptionOverride: dto.description,
          expectedResultOverride: dto.expectedResult,
          stepsOverride:
            dto.steps === undefined
              ? undefined
              : dto.steps.map((step, index) => ({
                  id: step.id ?? `run-step-${index + 1}`,
                  order: step.order,
                  description: step.description,
                  expectedResult: step.expectedResult ?? '',
                })),
          executedAt,
        },
      });

      if (changed) {
        await tx.testResultHistory.create({
          data: {
            testResultId: id,
            actorUserId: dto.lastModifiedById,
            previousStatus: current.status,
            newStatus: nextStatus,
            previousComment: current.comment,
            newComment: nextComment,
          },
        });
      }

      return tx.testResult.findUnique({
        where: { id: updated.id },
        include: TEST_RESULT_INCLUDE,
      });
    });
  }

  async addAttachments(
    id: string,
    attachments: PersistedTestResultAttachmentInput[],
    actorUserId?: string,
    testStepId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.testResult.findUnique({
        where: { id },
        select: {
          comment: true,
          legacyAttachments: true,
          status: true,
          testCaseId: true,
          testRunId: true,
        },
      });

      if (!current) {
        return null;
      }

      await tx.testResultAttachment.createMany({
        data: attachments.map((attachment) => ({
          testResultId: id,
          testRunId: current.testRunId,
          testCaseId: current.testCaseId,
          testStepId,
          uploadedById: actorUserId,
          fileName: attachment.fileName,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          size: attachment.size,
          url: attachment.url,
        })),
      });

      const uploadedUrls = attachments.map((attachment) => attachment.url);

      await tx.testResult.update({
        where: { id },
        data: {
          lastModifiedById: actorUserId,
          legacyAttachments: [...current.legacyAttachments, ...uploadedUrls],
        },
      });

      await tx.testResultHistory.create({
        data: {
          testResultId: id,
          actorUserId,
          previousStatus: current.status,
          newStatus: current.status,
          previousComment: current.comment,
          newComment: current.comment,
          addedAttachments: uploadedUrls,
        },
      });

      return tx.testResult.findUnique({
        where: { id },
        include: TEST_RESULT_INCLUDE,
      });
    });
  }

  async removeAttachment(id: string, attachmentId: string, actorUserId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.testResult.findUnique({
        where: { id },
        select: {
          comment: true,
          legacyAttachments: true,
          status: true,
        },
      });
      const attachment = await tx.testResultAttachment.findFirst({
        where: {
          id: attachmentId,
          testResultId: id,
        },
      });

      if (!current || !attachment) {
        return null;
      }

      await tx.testResultAttachment.delete({
        where: { id: attachment.id },
      });

      await tx.testResult.update({
        where: { id },
        data: {
          lastModifiedById: actorUserId,
          legacyAttachments: current.legacyAttachments.filter(
            (item) => item !== attachment.url,
          ),
        },
      });

      await tx.testResultHistory.create({
        data: {
          testResultId: id,
          actorUserId,
          previousStatus: current.status,
          newStatus: current.status,
          previousComment: current.comment,
          newComment: current.comment,
          removedAttachments: [attachment.url],
        },
      });

      return tx.testResult.findUnique({
        where: { id },
        include: TEST_RESULT_INCLUDE,
      });
    });
  }

  delete(id: string, actorUserId?: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.testResultAttachment.deleteMany({
        where: { testResultId: id },
      });

      return tx.testResult.update({
        where: { id },
        data: {
          executedById: null,
          lastModifiedById: actorUserId,
          legacyAttachments: [],
          executedAt: null,
          removedAt: new Date(),
        },
        include: TEST_RESULT_INCLUDE,
      });
    });
  }

  private buildWhere(
    params: Omit<FindTestResultsParams, 'skip' | 'take'>,
  ): Prisma.TestResultWhereInput {
    return {
      testRunId: params.testRunId,
      testCaseId: params.testCaseId,
      status: params.status,
      removedAt: null,
      testRun: { deletedAt: null },
    };
  }
}

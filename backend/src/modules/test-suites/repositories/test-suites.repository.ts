import { Injectable } from '@nestjs/common';
import { Prisma, TestCaseStatus, TestPriority, TestSeverity } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTestSuiteDto } from '../dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from '../dto/update-test-suite.dto';
import { NormalizedImportedTestCase } from '../test-case-import.validation';

type FindTestSuitesParams = {
  projectId?: string;
  search?: string;
  skip: number;
  take: number;
};

function normalizeSectionKey(section: string) {
  return section
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

@Injectable()
export class TestSuitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTestSuiteDto, projectIds: string[]) {
    return this.prisma.testSuite.create({
      data: {
        name: dto.name,
        position: dto.position ?? 0,
        projects: projectIds.length > 0 ? { connect: projectIds.map((id) => ({ id })) } : undefined,
      },
      include: {
        projects: {
          where: { deletedAt: null },
          select: {
            id: true,
            key: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            testCases: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  findMany({ projectId, search, skip, take }: FindTestSuitesParams) {
    const where = this.buildWhere({ projectId, search });

    return this.prisma.testSuite.findMany({
      where,
      skip,
      take,
      orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      include: {
        projects: {
          where: { deletedAt: null },
          select: {
            id: true,
            key: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            testCases: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  count(projectId?: string, search?: string) {
    return this.prisma.testSuite.count({
      where: this.buildWhere({ projectId, search }),
    });
  }

  findById(id: string) {
    return this.prisma.testSuite.findFirst({
      where: { id, deletedAt: null },
      include: {
        projects: {
          where: { deletedAt: null },
          select: {
            id: true,
            key: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            testCases: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  countByIdsInProject(ids: string[], projectId: string) {
    return this.prisma.testSuite.count({
      where: {
        id: { in: ids },
        OR: [
          { projects: { some: { id: projectId, deletedAt: null } } },
          { projects: { none: {} } },
        ],
        deletedAt: null,
      },
    });
  }

  countByIds(ids: string[]) {
    return this.prisma.testSuite.count({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
    });
  }

  findPositionsByIds(ids: string[]) {
    return this.prisma.testSuite.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, position: true },
    });
  }

  findActiveCaseIds(suiteId: string) {
    return this.prisma.testCase
      .findMany({
        where: { suiteId, deletedAt: null },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true },
      })
      .then((cases) => cases.map((testCase) => testCase.id));
  }

  reorderCases(suiteId: string, caseIds: string[]) {
    return this.prisma.$transaction(
      caseIds.map((id, index) =>
        this.prisma.testCase.updateMany({
          where: { id, suiteId },
          data: { position: index + 1 },
        }),
      ),
    );
  }

  update(id: string, dto: UpdateTestSuiteDto, projectIds?: string[]) {
    return this.prisma.testSuite.update({
      where: { id },
      data: {
        name: dto.name,
        position: dto.position,
        projects: projectIds
          ? { set: projectIds.map((projectId) => ({ id: projectId })) }
          : undefined,
      },
      include: {
        projects: {
          where: { deletedAt: null },
          select: {
            id: true,
            key: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            testCases: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  importTestCases(suiteId: string, rows: NormalizedImportedTestCase[]) {
    return this.prisma.$transaction(async (tx) => {
      const lastCase = await tx.testCase.aggregate({
        where: { suiteId },
        _max: { position: true },
      });
      const firstPosition = (lastCase._max.position ?? 0) + 1;
      const existingSections = await tx.testCase.findMany({
        where: {
          suiteId,
          deletedAt: null,
          section: {
            not: '',
          },
        },
        distinct: ['section'],
        select: {
          section: true,
        },
      });
      const existingSectionKeys = new Set(
        existingSections.map((item) => normalizeSectionKey(item.section)),
      );
      const incomingSections = [
        ...new Map(
          rows
            .map((row) => row.section)
            .filter(Boolean)
            .map((section) => [normalizeSectionKey(section), section]),
        ).values(),
      ];
      const createdSections = incomingSections.filter(
        (section) => !existingSectionKeys.has(normalizeSectionKey(section)),
      );
      const caseRows = rows.map((row, index) => ({
        id: randomUUID(),
        suiteId,
        title: row.title,
        description: row.description,
        preconditions: '',
        expectedResult: row.expectedResult,
        section: row.section,
        position: firstPosition + index,
        status: TestCaseStatus.ACTIVE,
        priority: TestPriority.MEDIUM,
        severity: TestSeverity.MEDIUM,
        tags: [],
      }));
      const steps = rows.flatMap((row, rowIndex) =>
        row.steps.map((step, stepIndex) => ({
          testCaseId: caseRows[rowIndex].id,
          order: step.order ?? stepIndex + 1,
          description: step.description,
          expectedResult: step.expectedResult,
        })),
      );

      await tx.testCase.createMany({
        data: caseRows,
      });

      if (steps.length > 0) {
        await tx.testStep.createMany({
          data: steps,
        });
      }

      return {
        imported: caseRows.length,
        createdSections,
      };
    });
  }

  delete(id: string) {
    const deletedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.testRun.updateMany({
        where: {
          deletedAt: null,
          suites: { some: { testSuiteId: id } },
        },
        data: { deletedAt },
      });
      await tx.testCase.updateMany({
        where: { suiteId: id, deletedAt: null },
        data: { deletedAt, status: TestCaseStatus.ARCHIVED },
      });

      return tx.testSuite.update({
        where: { id },
        data: { deletedAt },
      });
    });
  }

  private buildWhere(params: { projectId?: string; search?: string }): Prisma.TestSuiteWhereInput {
    return {
      deletedAt: null,
      AND: [
        params.projectId
          ? {
              OR: [
                { projects: { some: { id: params.projectId, deletedAt: null } } },
                { projects: { none: {} } },
              ],
            }
          : {},
        params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {},
      ],
    };
  }
}

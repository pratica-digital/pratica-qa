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

  create(dto: CreateTestSuiteDto) {
    return this.prisma.testSuite.create({
      data: {
        projectId: dto.projectId ?? null,
        name: dto.name,
        position: dto.position ?? 0,
      },
      include: {
        project: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
        _count: {
          select: {
            testCases: true,
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
      orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }],
      include: {
        project: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
        _count: {
          select: {
            testCases: true,
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
    return this.prisma.testSuite.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
        _count: {
          select: {
            testCases: true,
          },
        },
      },
    });
  }

  countByIdsInProject(ids: string[], projectId: string) {
    return this.prisma.testSuite.count({
      where: {
        id: { in: ids },
        OR: [{ projectId }, { projectId: null }],
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

  update(id: string, dto: UpdateTestSuiteDto) {
    return this.prisma.testSuite.update({
      where: { id },
      data: dto,
    });
  }

  importTestCases(suiteId: string, rows: NormalizedImportedTestCase[]) {
    return this.prisma.$transaction(async (tx) => {
      const existingSections = await tx.testCase.findMany({
        where: {
          suiteId,
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
      const caseRows = rows.map((row) => ({
        id: randomUUID(),
        suiteId,
        title: row.title,
        description: row.description,
        preconditions: '',
        expectedResult: row.expectedResult,
        section: row.section,
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
    return this.prisma.testSuite.delete({
      where: { id },
    });
  }

  private buildWhere(params: {
    projectId?: string;
    search?: string;
  }): Prisma.TestSuiteWhereInput {
    return {
      AND: [
        params.projectId ? { OR: [{ projectId: params.projectId }, { projectId: null }] } : {},
        params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {},
      ],
    };
  }
}

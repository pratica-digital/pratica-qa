import { Injectable } from '@nestjs/common';
import { Prisma, TestSuiteStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTestSuiteDto } from '../dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from '../dto/update-test-suite.dto';

type FindTestSuitesParams = {
  projectId?: string;
  search?: string;
  status?: TestSuiteStatus;
  skip: number;
  take: number;
};

@Injectable()
export class TestSuitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTestSuiteDto) {
    return this.prisma.testSuite.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description ?? '',
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

  findMany({ projectId, search, status, skip, take }: FindTestSuitesParams) {
    const where = this.buildWhere({ projectId, search, status });

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

  count(projectId?: string, search?: string, status?: TestSuiteStatus) {
    return this.prisma.testSuite.count({
      where: this.buildWhere({ projectId, search, status }),
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
        projectId,
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

  delete(id: string) {
    return this.prisma.testSuite.delete({
      where: { id },
    });
  }

  private buildWhere(params: {
    projectId?: string;
    search?: string;
    status?: TestSuiteStatus;
  }): Prisma.TestSuiteWhereInput {
    return {
      projectId: params.projectId,
      status: params.status,
      OR: params.search
        ? [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
  }
}

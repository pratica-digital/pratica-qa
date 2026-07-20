import { Injectable } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

type FindProjectsParams = {
  search?: string;
  status?: ProjectStatus;
  skip: number;
  take: number;
};

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        key: dto.key ?? '',
        description: dto.description ?? '',
        status: dto.status,
        category: dto.category,
        imageUrl: dto.imageUrl,
      },
    });
  }

  findMany({ search, status, skip, take }: FindProjectsParams) {
    const where = this.buildWhere({ search, status });

    return this.prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      include: {
        _count: {
          select: {
            suites: { where: { deletedAt: null } },
            testPlans: { where: { deletedAt: null } },
            testRuns: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  count(search?: string, status?: ProjectStatus) {
    return this.prisma.project.count({
      where: this.buildWhere({ search, status }),
    });
  }

  findById(id: string) {
    return this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            suites: { where: { deletedAt: null } },
            testPlans: { where: { deletedAt: null } },
            testRuns: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  findByKey(key: string) {
    return this.prisma.project.findUnique({
      where: { key },
      select: { id: true },
    });
  }

  update(id: string, dto: UpdateProjectDto) {
    const data: Prisma.ProjectUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.key !== undefined) {
      data.key = dto.key;
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.category !== undefined) {
      data.category = dto.category;
    }

    if (dto.imageUrl !== undefined) {
      data.imageUrl = dto.imageUrl;
    }

    if (dto.removeImage) {
      data.imageUrl = null;
    }

    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    const deletedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.testRun.updateMany({
        where: { projectId: id, deletedAt: null },
        data: { deletedAt },
      });
      await tx.testPlan.updateMany({
        where: { projectId: id, deletedAt: null },
        data: { deletedAt },
      });
      await tx.testCase.updateMany({
        where: { suite: { projectId: id }, deletedAt: null },
        data: { deletedAt, status: 'ARCHIVED' },
      });
      await tx.testSuite.updateMany({
        where: { projectId: id, deletedAt: null },
        data: { deletedAt },
      });

      return tx.project.update({
        where: { id },
        data: { deletedAt, status: 'ARCHIVED' },
      });
    });
  }

  private buildWhere(params: {
    search?: string;
    status?: ProjectStatus;
  }): Prisma.ProjectWhereInput {
    return {
      deletedAt: null,
      status: params.status,
      OR: params.search
        ? [
            { name: { contains: params.search, mode: 'insensitive' } },
            { key: { contains: params.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
  }
}

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
    const where: Prisma.ProjectWhereInput = {
      status,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { key: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    return this.prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            suites: true,
            testPlans: true,
            testRuns: true,
          },
        },
      },
    });
  }

  count(search?: string, status?: ProjectStatus) {
    const where: Prisma.ProjectWhereInput = {
      status,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { key: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    return this.prisma.project.count({ where });
  }

  findById(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            suites: true,
            testPlans: true,
            testRuns: true,
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
    return this.prisma.project.delete({
      where: { id },
    });
  }
}

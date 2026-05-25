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
        key: dto.key,
        description: dto.description ?? '',
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
            testRuns: true,
          },
        },
      },
    });
  }

  update(id: string, dto: UpdateProjectDto) {
    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  delete(id: string) {
    return this.prisma.project.delete({
      where: { id },
    });
  }
}

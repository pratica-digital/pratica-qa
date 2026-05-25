import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTestPlanDto } from '../dto/create-test-plan.dto';
import { TestPlanSectionDto } from '../dto/test-plan-section.dto';
import { UpdateTestPlanDto } from '../dto/update-test-plan.dto';

const TEST_PLAN_INCLUDE = {
  project: {
    select: {
      id: true,
      key: true,
      name: true,
    },
  },
  _count: {
    select: {
      testRuns: true,
    },
  },
} satisfies Prisma.TestPlanInclude;

type FindTestPlansParams = {
  projectId?: string;
  search?: string;
  version?: string;
  skip: number;
  take: number;
};

@Injectable()
export class TestPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTestPlanDto) {
    return this.prisma.testPlan.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        version: dto.version,
        description: dto.description ?? '',
        sections: this.toSections(dto.sections),
      },
      include: TEST_PLAN_INCLUDE,
    });
  }

  findMany(params: FindTestPlansParams) {
    return this.prisma.testPlan.findMany({
      where: this.buildWhere(params),
      skip: params.skip,
      take: params.take,
      orderBy: { updatedAt: 'desc' },
      include: TEST_PLAN_INCLUDE,
    });
  }

  count(params: Omit<FindTestPlansParams, 'skip' | 'take'>) {
    return this.prisma.testPlan.count({
      where: this.buildWhere(params),
    });
  }

  findById(id: string) {
    return this.prisma.testPlan.findUnique({
      where: { id },
      include: TEST_PLAN_INCLUDE,
    });
  }

  update(id: string, dto: UpdateTestPlanDto) {
    return this.prisma.testPlan.update({
      where: { id },
      data: {
        name: dto.name,
        version: dto.version,
        description: dto.description,
        sections: dto.sections ? this.toSections(dto.sections) : undefined,
      },
      include: TEST_PLAN_INCLUDE,
    });
  }

  delete(id: string) {
    return this.prisma.testPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private buildWhere(
    params: Omit<FindTestPlansParams, 'skip' | 'take'>,
  ): Prisma.TestPlanWhereInput {
    return {
      projectId: params.projectId,
      version: params.version,
      deletedAt: null,
      OR: params.search
        ? [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
  }

  private toSections(sections?: TestPlanSectionDto[]): Prisma.InputJsonValue {
    return (
      sections?.map((section) => ({
        type: section.type ?? 'text',
        title: section.title,
        content: section.content,
        priority: section.priority,
      })) ?? []
    );
  }
}

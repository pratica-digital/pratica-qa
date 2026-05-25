import { Injectable, NotFoundException } from '@nestjs/common';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { ProjectsRepository } from '../projects/repositories/projects.repository';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { QueryTestPlansDto } from './dto/query-test-plans.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';
import { TestPlansRepository } from './repositories/test-plans.repository';

@Injectable()
export class TestPlansService {
  constructor(
    private readonly testPlansRepository: TestPlansRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async create(dto: CreateTestPlanDto) {
    const project = await this.projectsRepository.findById(dto.projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.testPlansRepository.create(dto);
  }

  async findAll(query: QueryTestPlansDto) {
    const pagination = getPagination(query);
    const filters = {
      projectId: query.projectId,
      search: query.search,
      version: query.version,
    };
    const [data, total] = await Promise.all([
      this.testPlansRepository.findMany({
        ...filters,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.testPlansRepository.count(filters),
    ]);

    return {
      data,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.take,
      },
    };
  }

  async findOne(id: string) {
    const testPlan = await this.testPlansRepository.findById(id);

    if (!testPlan || testPlan.deletedAt) {
      throw new NotFoundException('Test plan not found');
    }

    return testPlan;
  }

  async update(id: string, dto: UpdateTestPlanDto) {
    await this.findOne(id);
    return this.testPlansRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.testPlansRepository.delete(id);
  }
}

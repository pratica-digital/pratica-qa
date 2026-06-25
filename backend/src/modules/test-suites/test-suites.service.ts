import { Injectable, NotFoundException } from '@nestjs/common';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { ProjectsRepository } from '../projects/repositories/projects.repository';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { QueryTestSuitesDto } from './dto/query-test-suites.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import { TestSuitesRepository } from './repositories/test-suites.repository';

@Injectable()
export class TestSuitesService {
  constructor(
    private readonly testSuitesRepository: TestSuitesRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async create(dto: CreateTestSuiteDto) {
    const project = await this.projectsRepository.findById(dto.projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.testSuitesRepository.create(dto);
  }

  async findAll(query: QueryTestSuitesDto) {
    const pagination = getPagination(query);
    const [data, total] = await Promise.all([
      this.testSuitesRepository.findMany({
        projectId: query.projectId,
        search: query.search,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.testSuitesRepository.count(query.projectId, query.search),
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
    const suite = await this.testSuitesRepository.findById(id);

    if (!suite) {
      throw new NotFoundException('Test suite not found');
    }

    return suite;
  }

  async update(id: string, dto: UpdateTestSuiteDto) {
    await this.findOne(id);
    return this.testSuitesRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.testSuitesRepository.delete(id);
  }
}

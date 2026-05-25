import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { TestPlansRepository } from '../test-plans/repositories/test-plans.repository';
import { TestSuitesRepository } from '../test-suites/repositories/test-suites.repository';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { QueryTestRunsDto } from './dto/query-test-runs.dto';
import { RerunFailedTestsDto } from './dto/rerun-failed-tests.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';
import { TestRunsRepository } from './repositories/test-runs.repository';

@Injectable()
export class TestRunsService {
  constructor(
    private readonly testRunsRepository: TestRunsRepository,
    private readonly testPlansRepository: TestPlansRepository,
    private readonly testSuitesRepository: TestSuitesRepository,
  ) {}

  async create(dto: CreateTestRunDto) {
    const testPlan = await this.testPlansRepository.findById(dto.testPlanId);

    if (!testPlan || testPlan.deletedAt) {
      throw new NotFoundException('Test plan not found');
    }

    if (testPlan.projectId !== dto.projectId) {
      throw new BadRequestException('Test plan does not belong to the project');
    }

    const suiteIds = [...new Set(dto.suiteIds)];
    const suiteCount = await this.testSuitesRepository.countByIdsInProject(suiteIds, dto.projectId);

    if (suiteCount !== suiteIds.length) {
      throw new BadRequestException('All test suites must belong to the project');
    }

    return this.testRunsRepository.create(dto, suiteIds);
  }

  async findAll(query: QueryTestRunsDto) {
    const pagination = getPagination(query);
    const filters = {
      projectId: query.projectId,
      testPlanId: query.testPlanId,
      search: query.search,
      status: query.status,
    };
    const [data, total] = await Promise.all([
      this.testRunsRepository.findMany({
        ...filters,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.testRunsRepository.count(filters),
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
    const testRun = await this.testRunsRepository.findById(id);

    if (!testRun || testRun.deletedAt) {
      throw new NotFoundException('Test run not found');
    }

    return testRun;
  }

  async update(id: string, dto: UpdateTestRunDto) {
    await this.findOne(id);
    return this.testRunsRepository.update(id, dto);
  }

  async start(id: string) {
    await this.findOne(id);
    return this.testRunsRepository.start(id);
  }

  async complete(id: string) {
    await this.findOne(id);
    return this.testRunsRepository.complete(id);
  }

  async rerunFailed(id: string, dto: RerunFailedTestsDto) {
    await this.findOne(id);
    const result = await this.testRunsRepository.rerunFailed(id, dto);

    if (!result) {
      throw new NotFoundException('Test run not found');
    }

    if (result.failedCount === 0 || !result.testRun) {
      throw new BadRequestException('Test run has no failed results to re-run');
    }

    return result.testRun;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.testRunsRepository.delete(id);
  }
}

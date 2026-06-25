import { Injectable, NotFoundException } from '@nestjs/common';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { TestSuitesRepository } from '../test-suites/repositories/test-suites.repository';
import { BulkUpdateTestCasesDto } from './dto/bulk-update-test-cases.dto';
import { CloneTestCaseDto } from './dto/clone-test-case.dto';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { QueryTestCasesDto } from './dto/query-test-cases.dto';
import { ReplaceTestStepsDto } from './dto/replace-test-steps.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { TestCasesRepository } from './repositories/test-cases.repository';

@Injectable()
export class TestCasesService {
  constructor(
    private readonly testCasesRepository: TestCasesRepository,
    private readonly testSuitesRepository: TestSuitesRepository,
  ) {}

  async create(dto: CreateTestCaseDto) {
    await this.ensureSuiteExists(dto.suiteId);
    return this.testCasesRepository.create(dto);
  }

  async findAll(query: QueryTestCasesDto) {
    const pagination = getPagination(query);
    const filters = {
      suiteId: query.suiteId,
      projectId: query.projectId,
      search: query.search,
      tag: query.tag,
      status: query.status,
      severity: query.severity,
    };
    const [data, total] = await Promise.all([
      this.testCasesRepository.findMany({
        ...filters,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.testCasesRepository.count(filters),
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
    const testCase = await this.testCasesRepository.findById(id);

    if (!testCase) {
      throw new NotFoundException('Test case not found');
    }

    return testCase;
  }

  async update(id: string, dto: UpdateTestCaseDto) {
    await this.findOne(id);
    return this.testCasesRepository.update(id, dto);
  }

  async replaceSteps(id: string, dto: ReplaceTestStepsDto) {
    await this.findOne(id);
    return this.testCasesRepository.replaceSteps(id, dto);
  }

  async clone(id: string, dto: CloneTestCaseDto) {
    if (dto.suiteId) {
      await this.ensureSuiteExists(dto.suiteId);
    }

    const cloned = await this.testCasesRepository.clone(id, dto);

    if (!cloned) {
      throw new NotFoundException('Test case not found');
    }

    return cloned;
  }

  bulkUpdateStatus(dto: BulkUpdateTestCasesDto) {
    return this.testCasesRepository.bulkUpdateStatus(dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.testCasesRepository.delete(id);
  }

  private async ensureSuiteExists(suiteId: string) {
    const suite = await this.testSuitesRepository.findById(suiteId);

    if (!suite) {
      throw new NotFoundException('Test suite not found');
    }
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { TestCasesRepository } from '../test-cases/repositories/test-cases.repository';
import { TestRunsRepository } from '../test-runs/repositories/test-runs.repository';
import { AddTestResultAttachmentsDto } from './dto/add-test-result-attachments.dto';
import { CreateTestResultDto } from './dto/create-test-result.dto';
import { QueryTestResultsDto } from './dto/query-test-results.dto';
import { UpdateTestResultDto } from './dto/update-test-result.dto';
import { TestResultsRepository } from './repositories/test-results.repository';

@Injectable()
export class TestResultsService {
  constructor(
    private readonly testResultsRepository: TestResultsRepository,
    private readonly testRunsRepository: TestRunsRepository,
    private readonly testCasesRepository: TestCasesRepository,
  ) {}

  async create(dto: CreateTestResultDto) {
    await this.ensureRunCanContainCase(dto.testRunId, dto.testCaseId);
    return this.testResultsRepository.create(dto);
  }

  async findAll(query: QueryTestResultsDto) {
    const pagination = getPagination(query);
    const filters = {
      testRunId: query.testRunId,
      testCaseId: query.testCaseId,
      status: query.status,
    };
    const [data, total] = await Promise.all([
      this.testResultsRepository.findMany({
        ...filters,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.testResultsRepository.count(filters),
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
    const testResult = await this.testResultsRepository.findById(id);

    if (!testResult) {
      throw new NotFoundException('Test result not found');
    }

    return testResult;
  }

  async update(id: string, dto: UpdateTestResultDto) {
    await this.findOne(id);
    return this.testResultsRepository.update(id, dto);
  }

  async addAttachments(id: string, dto: AddTestResultAttachmentsDto) {
    await this.findOne(id);
    return this.testResultsRepository.addAttachments(id, dto.attachments);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.testResultsRepository.delete(id);
  }

  private async ensureRunCanContainCase(testRunId: string, testCaseId: string) {
    const [testRun, testCase] = await Promise.all([
      this.testRunsRepository.findById(testRunId),
      this.testCasesRepository.findById(testCaseId),
    ]);

    if (!testRun || testRun.deletedAt) {
      throw new NotFoundException('Test run not found');
    }

    if (!testCase || testCase.deletedAt) {
      throw new NotFoundException('Test case not found');
    }

    const runSuiteIds = testRun.suites.map((suite) => suite.testSuiteId);

    if (!runSuiteIds.includes(testCase.suiteId)) {
      throw new BadRequestException('Test case does not belong to any suite in this test run');
    }
  }
}

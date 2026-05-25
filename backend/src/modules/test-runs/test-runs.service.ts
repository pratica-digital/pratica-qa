import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TestResultStatus, UserRole, UserStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { TestPlansRepository } from '../test-plans/repositories/test-plans.repository';
import { TestSuitesRepository } from '../test-suites/repositories/test-suites.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import { AssignTestRunDto } from './dto/assign-test-run.dto';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { ExecuteTestRunDto } from './dto/execute-test-run.dto';
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
    private readonly usersRepository: UsersRepository,
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

    await this.ensureAssignableUser(dto.assignedToId);

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

  async assign(id: string, dto: AssignTestRunDto) {
    await this.findOne(id);
    await this.ensureAssignableUser(dto.assignedToId);
    return this.testRunsRepository.assign(id, dto.assignedToId);
  }

  async start(id: string, user: AuthenticatedUser) {
    const testRun = await this.findOne(id);
    this.ensureCanExecute(testRun.assignedToId, user);
    return this.testRunsRepository.start(id);
  }

  async complete(id: string, user: AuthenticatedUser) {
    const testRun = await this.findOne(id);
    this.ensureCanExecute(testRun.assignedToId, user);
    return this.testRunsRepository.complete(id);
  }

  async execute(id: string, dto: ExecuteTestRunDto, user: AuthenticatedUser) {
    if (!dto.testResultId && !dto.testCaseId) {
      throw new BadRequestException('testResultId or testCaseId is required');
    }

    if (dto.status === TestResultStatus.PENDING) {
      throw new BadRequestException('Execution status must be PASSED, FAILED, or SKIPPED');
    }

    const testRun = await this.findOne(id);
    this.ensureCanExecute(testRun.assignedToId, user);

    const result = await this.testRunsRepository.executeResult(id, dto, user.id);

    if (!result) {
      throw new NotFoundException('Test result not found in this test run');
    }

    return result;
  }

  async rerunFailed(id: string, dto: RerunFailedTestsDto, user: AuthenticatedUser) {
    const testRun = await this.findOne(id);
    this.ensureCanExecute(testRun.assignedToId, user);
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

  private async ensureAssignableUser(assignedToId: string) {
    const user = await this.usersRepository.findById(assignedToId);

    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('Assigned user not found');
    }
  }

  private ensureCanExecute(assignedToId: string, user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN || assignedToId === user.id) {
      return;
    }

    throw new ForbiddenException('Only the assigned user or an admin can execute this test run');
  }
}

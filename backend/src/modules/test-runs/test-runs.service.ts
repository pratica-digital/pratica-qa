import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TestRunTestType, UserRole, UserStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { ShortcutFailureStoryService } from '../../shortcut/shortcut-failure-story.service';
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

type SuiteAssignment = {
  suiteId: string;
  testType: TestRunTestType;
};

@Injectable()
export class TestRunsService {
  constructor(
    private readonly testRunsRepository: TestRunsRepository,
    private readonly testPlansRepository: TestPlansRepository,
    private readonly testSuitesRepository: TestSuitesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly shortcutFailureStoryService: ShortcutFailureStoryService,
  ) {}

  async create(dto: CreateTestRunDto) {
    let resolvedProjectId = dto.projectId;

    if (dto.testPlanId) {
      const testPlan = await this.testPlansRepository.findById(dto.testPlanId);

      if (!testPlan || testPlan.deletedAt) {
        throw new NotFoundException('Test plan not found');
      }

      if (resolvedProjectId && testPlan.projectId !== resolvedProjectId) {
        throw new BadRequestException('Test plan does not belong to the project');
      }

      resolvedProjectId ??= testPlan.projectId;
    }

    const suiteAssignments = this.buildSuiteAssignments(dto);
    const suiteIds = suiteAssignments.map((assignment) => assignment.suiteId);

    if (suiteIds.length > 0) {
      const suiteCount = resolvedProjectId
        ? await this.testSuitesRepository.countByIdsInProject(suiteIds, resolvedProjectId)
        : await this.testSuitesRepository.countByIds(suiteIds);

      if (suiteCount !== suiteIds.length) {
        throw new BadRequestException(
          resolvedProjectId
            ? 'All test suites must belong to the project'
            : 'One or more test suites were not found',
        );
      }
    }

    await this.ensureAssignableUser(dto.assignedToId);

    return this.testRunsRepository.create(
      { ...dto, projectId: resolvedProjectId },
      suiteAssignments,
    );
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

  async findAssignableUsers() {
    const users = await this.usersRepository.findMany({
      role: UserRole.QA,
      status: UserStatus.ACTIVE,
      skip: 0,
      take: 100,
    });

    return users.map((user) => this.usersRepository.toPublicUser(user));
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

    const testRun = await this.findOne(id);
    this.ensureCanExecute(testRun.assignedToId, user);

    const result = await this.testRunsRepository.executeResult(id, dto, user.id);

    if (!result) {
      throw new NotFoundException('Test result not found in this test run');
    }

    await this.shortcutFailureStoryService.createForFailedResult(result);

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

    return result;
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

  private buildSuiteAssignments(dto: CreateTestRunDto): SuiteAssignment[] {
    if (dto.testTypes?.length) {
      const seenTypes = new Set<TestRunTestType>();
      const seenSuites = new Set<string>();
      const assignments: SuiteAssignment[] = [];

      for (const testType of dto.testTypes) {
        if (seenTypes.has(testType.type)) {
          throw new BadRequestException('Test types must be unique');
        }

        seenTypes.add(testType.type);

        for (const suiteId of testType.suites) {
          if (seenSuites.has(suiteId)) {
            throw new BadRequestException('Each test suite can belong to only one test type');
          }

          seenSuites.add(suiteId);
          assignments.push({
            suiteId,
            testType: testType.type,
          });
        }
      }

      return assignments;
    }

    if (dto.suiteIds?.length) {
      return [...new Set(dto.suiteIds)].map((suiteId) => ({
        suiteId,
        testType: TestRunTestType.FUNCIONAL,
      }));
    }

    throw new BadRequestException('Select at least one test type');
  }

  private ensureCanExecute(assignedToId: string, user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.QA || assignedToId === user.id) {
      return;
    }

    throw new ForbiddenException('Only QA users or admins can execute this test run');
  }
}

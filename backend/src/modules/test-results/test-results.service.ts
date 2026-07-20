import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TestResultStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { removeRuntimeUpload, removeRuntimeUploads } from '../../common/files/runtime-upload-storage';
import { resolveRuntimeUploadPath } from '../../common/files/runtime-upload-storage';
import { stat } from 'node:fs/promises';
import { ShortcutFailureStoryService } from '../../shortcut/shortcut-failure-story.service';
import { TestCasesRepository } from '../test-cases/repositories/test-cases.repository';
import { TestRunsRepository } from '../test-runs/repositories/test-runs.repository';
import { AddTestResultAttachmentsDto } from './dto/add-test-result-attachments.dto';
import { CreateTestResultDto } from './dto/create-test-result.dto';
import { QueryTestResultsDto } from './dto/query-test-results.dto';
import { PersistedTestResultAttachmentInput } from './test-result-attachment-upload';
import { UpdateTestResultDto } from './dto/update-test-result.dto';
import { TestResultsRepository } from './repositories/test-results.repository';

type AddPersistedTestResultAttachmentsDto = AddTestResultAttachmentsDto & {
  attachments?: PersistedTestResultAttachmentInput[];
};

@Injectable()
export class TestResultsService {
  constructor(
    private readonly testResultsRepository: TestResultsRepository,
    private readonly testRunsRepository: TestRunsRepository,
    private readonly testCasesRepository: TestCasesRepository,
    private readonly shortcutFailureStoryService: ShortcutFailureStoryService,
  ) {}

  async create(dto: CreateTestResultDto) {
    if (dto.status && dto.status !== TestResultStatus.PENDING && !dto.executedById) {
      throw new BadRequestException('executedById is required for executed results');
    }

    await this.ensureRunCanContainCase(dto.testRunId, dto.testCaseId);
    const testResult = await this.testResultsRepository.create(dto);
    await this.testRunsRepository.refreshExecutionStatus(testResult.testRunId);
    await this.shortcutFailureStoryService.createForFailedResult(testResult);

    return this.testResultsRepository.findById(testResult.id);
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

    if (!testResult || testResult.removedAt) {
      throw new NotFoundException('Test result not found');
    }

    return testResult;
  }

  async update(id: string, dto: UpdateTestResultDto, user: AuthenticatedUser) {
    const testResult = await this.findOne(id);
    this.ensureCanExecuteResult(testResult.testRun.assignedToId, user);

    const updatedResult = await this.testResultsRepository.update(id, {
      ...dto,
      executedById: user.id,
      lastModifiedById: user.id,
    });

    if (!updatedResult) {
      throw new NotFoundException('Test result not found');
    }

    await this.testRunsRepository.refreshExecutionStatus(updatedResult.testRunId);
    await this.shortcutFailureStoryService.createForFailedResult(updatedResult);

    return this.testResultsRepository.findById(updatedResult.id);
  }

  async addAttachments(
    id: string,
    dto: AddPersistedTestResultAttachmentsDto,
    user: AuthenticatedUser,
  ) {
    let persisted = false;

    try {
      const testResult = await this.findOne(id);
      this.ensureCanExecuteResult(testResult.testRun.assignedToId, user);

      if (!dto.attachments?.length) {
        throw new BadRequestException('At least one attachment is required');
      }

      if (
        dto.testStepId &&
        !testResult.testCase.steps?.some((step) => step.id === dto.testStepId)
      ) {
        throw new BadRequestException('Test step does not belong to this test case');
      }

      const updatedResult = await this.testResultsRepository.addAttachments(
        id,
        dto.attachments,
        user.id,
        dto.testStepId,
      );

      if (!updatedResult) {
        throw new NotFoundException('Test result not found');
      }

      persisted = true;
      await this.shortcutFailureStoryService.createForFailedResult(updatedResult);

      return this.testResultsRepository.findById(updatedResult.id);
    } catch (error) {
      if (!persisted) {
        await removeRuntimeUploads(dto.attachments?.map((attachment) => attachment.url) ?? []);
      }

      throw error;
    }
  }

  async removeAttachment(id: string, attachmentId: string, user: AuthenticatedUser) {
    const testResult = await this.findOne(id);
    this.ensureCanExecuteResult(testResult.testRun.assignedToId, user);
    const attachment = testResult.attachments.find((item) => item.id === attachmentId);

    const updatedResult = await this.testResultsRepository.removeAttachment(
      id,
      attachmentId,
      user.id,
    );

    if (!updatedResult) {
      throw new NotFoundException('Attachment not found');
    }

    await removeRuntimeUpload(attachment?.url);

    return updatedResult;
  }

  async getAttachmentContent(attachmentId: string) {
    const attachment = await this.testResultsRepository.findAttachmentById(attachmentId);
    const filePath = attachment ? resolveRuntimeUploadPath(attachment.url) : null;

    if (!attachment || !filePath) {
      throw new NotFoundException('Attachment not found');
    }

    try {
      await stat(filePath);
    } catch {
      throw new NotFoundException('Attachment file not found');
    }

    return { attachment, filePath };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const testResult = await this.findOne(id);
    this.ensureCanExecuteResult(testResult.testRun.assignedToId, user);

    const deletedResult = await this.testResultsRepository.delete(id, user.id);
    await removeRuntimeUploads(testResult.attachments.map((attachment) => attachment.url));
    await this.testRunsRepository.refreshExecutionStatus(testResult.testRunId);

    return deletedResult;
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

  private ensureCanExecuteResult(assignedToId: string, user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.QA || assignedToId === user.id) {
      return;
    }

    throw new ForbiddenException('Only QA users or admins can update this test result');
  }
}

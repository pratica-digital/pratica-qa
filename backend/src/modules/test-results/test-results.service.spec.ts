import { TestResultStatus, TestRunStatus, UserRole, UserStatus } from '@prisma/client';
import { TestResultsService } from './test-results.service';

describe('TestResultsService', () => {
  it('updates a result from a completed run and refreshes its execution status', async () => {
    const completedResult = {
      id: 'result-id',
      status: TestResultStatus.FAILED,
      testRunId: 'run-id',
      testRun: {
        assignedToId: 'qa-id',
        status: TestRunStatus.COMPLETED,
      },
    };
    const refreshedResult = {
      ...completedResult,
      status: TestResultStatus.PASSED,
      testRun: {
        ...completedResult.testRun,
        status: TestRunStatus.COMPLETED,
      },
    };
    const testResultsRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(completedResult)
        .mockResolvedValueOnce(refreshedResult),
      update: jest.fn().mockResolvedValue({
        id: 'result-id',
        status: TestResultStatus.PASSED,
        testRunId: 'run-id',
      }),
    };
    const testRunsRepository = {
      refreshExecutionStatus: jest.fn().mockResolvedValue({
        id: 'run-id',
        status: TestRunStatus.COMPLETED,
      }),
    };
    const shortcutFailureStoryService = {
      createForFailedResult: jest.fn().mockResolvedValue(null),
    };
    const service = new TestResultsService(
      testResultsRepository as never,
      testRunsRepository as never,
      {} as never,
      shortcutFailureStoryService as never,
    );
    const user = {
      id: 'qa-id',
      email: 'qa@example.com',
      firstAccess: false,
      name: 'QA',
      passwordChangedAt: null,
      role: UserRole.QA,
      status: UserStatus.ACTIVE,
    };

    await expect(
      service.update('result-id', { status: TestResultStatus.PASSED }, user),
    ).resolves.toEqual(refreshedResult);
    expect(testResultsRepository.update).toHaveBeenCalledWith('result-id', {
      status: TestResultStatus.PASSED,
      executedById: 'qa-id',
      lastModifiedById: 'qa-id',
    });
    expect(testRunsRepository.refreshExecutionStatus).toHaveBeenCalledWith('run-id');
  });
});

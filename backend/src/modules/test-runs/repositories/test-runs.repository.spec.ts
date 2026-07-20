import { TestRunStatus } from '@prisma/client';
import { TestRunsRepository } from './test-runs.repository';

describe('TestRunsRepository', () => {
  it('reopens a completed run when a result returns to pending', async () => {
    const prisma = {
      testRun: {
        findUnique: jest.fn().mockResolvedValue({
          completedAt: new Date('2026-07-20T10:00:00Z'),
          status: TestRunStatus.COMPLETED,
        }),
        update: jest.fn().mockResolvedValue({
          completedAt: null,
          id: 'run-id',
          status: TestRunStatus.IN_PROGRESS,
        }),
      },
      testResult: {
        groupBy: jest
          .fn()
          .mockResolvedValueOnce([{ testCaseId: 'case-1' }, { testCaseId: 'case-2' }])
          .mockResolvedValueOnce([{ testCaseId: 'case-1' }]),
      },
    };
    const repository = new TestRunsRepository(prisma as never);

    await expect(repository.refreshExecutionStatus('run-id')).resolves.toMatchObject({
      completedAt: null,
      status: TestRunStatus.IN_PROGRESS,
    });
    expect(prisma.testRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        completedAt: null,
        status: TestRunStatus.IN_PROGRESS,
      },
      where: { id: 'run-id' },
    }));
  });
});

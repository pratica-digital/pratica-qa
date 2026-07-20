import { TestRunStatus, TestRunTestType } from '@prisma/client';
import { TestRunsRepository } from './test-runs.repository';

describe('TestRunsRepository', () => {
  it('creates results in suite and numeric case order with a stable global position', async () => {
    const tx = {
      testCase: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'case-12', position: 12, suiteId: 'suite-a' },
          { id: 'case-2', position: 2, suiteId: 'suite-a' },
          { id: 'case-b', position: 1, suiteId: 'suite-b' },
        ]),
      },
      testResult: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
      testRun: {
        create: jest.fn().mockResolvedValue({ id: 'run-id' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'run-id' }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new TestRunsRepository(prisma as never);

    await repository.create(
      {
        assignedToId: 'user-id',
        name: 'Run',
      },
      [
        { suiteId: 'suite-b', testType: TestRunTestType.FUNCIONAL },
        { suiteId: 'suite-a', testType: TestRunTestType.REGRESSAO },
      ],
    );

    expect(tx.testResult.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ testCaseId: 'case-b', position: 1 }),
        expect.objectContaining({ testCaseId: 'case-2', position: 2 }),
        expect.objectContaining({ testCaseId: 'case-12', position: 3 }),
      ],
    });
  });

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
    expect(prisma.testRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          completedAt: null,
          status: TestRunStatus.IN_PROGRESS,
        },
        where: { id: 'run-id' },
      }),
    );
  });
});

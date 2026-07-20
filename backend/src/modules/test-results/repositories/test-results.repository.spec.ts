import { TestResultStatus } from '@prisma/client';
import { TestResultsRepository } from './test-results.repository';

describe('TestResultsRepository', () => {
  it('persists the changed status and records its audit history', async () => {
    const current = {
      comment: 'Falha encontrada',
      executedAt: new Date('2026-07-20T10:00:00Z'),
      executedById: 'qa-id',
      status: TestResultStatus.FAILED,
    };
    const persisted = {
      id: 'result-id',
      comment: current.comment,
      status: TestResultStatus.PASSED,
    };
    const tx = {
      testResult: {
        findUnique: jest.fn().mockResolvedValueOnce(current).mockResolvedValueOnce(persisted),
        update: jest.fn().mockResolvedValue({ id: 'result-id' }),
      },
      testResultHistory: {
        create: jest.fn().mockResolvedValue({ id: 'history-id' }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new TestResultsRepository(prisma as never);

    await expect(repository.update('result-id', {
      status: TestResultStatus.PASSED,
      executedById: 'qa-id',
      lastModifiedById: 'qa-id',
    })).resolves.toEqual(persisted);

    expect(tx.testResult.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        lastModifiedById: 'qa-id',
        status: TestResultStatus.PASSED,
      }),
      where: { id: 'result-id' },
    }));
    expect(tx.testResultHistory.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'qa-id',
        newComment: 'Falha encontrada',
        newStatus: TestResultStatus.PASSED,
        previousComment: 'Falha encontrada',
        previousStatus: TestResultStatus.FAILED,
        testResultId: 'result-id',
      },
    });
  });
});

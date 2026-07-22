import { Prisma, TestResultStatus, TestRunStatus, TestRunTestType } from '@prisma/client';
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

  it('updates suite classifications atomically and returns the complete run', async () => {
    const tx = {
      testRun: {
        update: jest.fn().mockResolvedValue({ id: 'run-id' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'run-id', suites: [] }),
      },
      testRunSuite: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new TestRunsRepository(prisma as never);

    await repository.update(
      'run-id',
      {},
      [
        { suiteId: 'suite-a', testType: TestRunTestType.SMOKE },
        { suiteId: 'suite-b', testType: TestRunTestType.REGRESSAO },
      ],
    );

    expect(tx.testRunSuite.update).toHaveBeenCalledTimes(2);
    expect(tx.testRunSuite.update).toHaveBeenCalledWith({
      where: {
        testRunId_testSuiteId: { testRunId: 'run-id', testSuiteId: 'suite-a' },
      },
      data: { testType: TestRunTestType.SMOKE },
    });
    expect(tx.testRun.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'run-id' } }),
    );
  });

  it('updates only name and description when suite classifications are omitted', async () => {
    const updatedRun = {
      id: 'run-id',
      name: 'Nome atualizado',
      status: TestRunStatus.IN_PROGRESS,
    };
    const prisma = {
      testRun: {
        update: jest.fn().mockResolvedValue(updatedRun),
      },
    };
    const repository = new TestRunsRepository(prisma as never);

    await expect(
      repository.update('run-id', { name: 'Nome atualizado' }),
    ).resolves.toEqual(updatedRun);
    expect(prisma.testRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-id' },
        data: {
          name: 'Nome atualizado',
          description: undefined,
        },
      }),
    );
    expect(prisma.testRun.update.mock.calls[0][0].data).not.toHaveProperty('status');
    expect(prisma.testRun.update.mock.calls[0][0].data).not.toHaveProperty('suites');
    expect(prisma.testRun.update.mock.calls[0][0].data).not.toHaveProperty('results');
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

  describe('addTests', () => {
    const requestedCases = [
      {
        id: 'case-existing',
        position: 1,
        suiteId: 'suite-1',
        suitePosition: 1,
      },
      {
        id: 'case-new',
        position: 2,
        suiteId: 'suite-1',
        suitePosition: 1,
      },
    ];

    function setupTransaction(status: TestRunStatus = TestRunStatus.IN_PROGRESS) {
      const tx = {
        auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-id' }) },
        testResult: {
          aggregate: jest.fn().mockResolvedValue({ _max: { position: 4 } }),
          count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2),
          createManyAndReturn: jest.fn().mockResolvedValue([{ testCaseId: 'case-new' }]),
          findMany: jest.fn().mockResolvedValue([{ testCaseId: 'case-existing' }]),
        },
        testRun: {
          findUnique: jest.fn().mockResolvedValue({ deletedAt: null, status }),
          update: jest.fn().mockResolvedValue({ id: 'run-id' }),
        },
        testRunSuite: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest.fn().mockResolvedValue([{ position: 1, testSuiteId: 'suite-old' }]),
        },
      };
      const prisma = {
        $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
      };

      return { prisma, repository: new TestRunsRepository(prisma as never), tx };
    }

    it('appends only new pending results and audits the actor and totals', async () => {
      const { prisma, repository, tx } = setupTransaction();

      await expect(
        repository.addTests('run-id', requestedCases, ['suite-1'], 'actor-id'),
      ).resolves.toEqual({
        status: 'ADDED',
        previousTotal: 1,
        newTotal: 2,
        addedCount: 1,
        ignoredDuplicateCount: 1,
        addedTestCaseIds: ['case-new'],
        ignoredTestCaseIds: ['case-existing'],
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
      expect(tx.testResult.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          {
            position: 5,
            status: TestResultStatus.PENDING,
            testCaseId: 'case-new',
            testRunId: 'run-id',
          },
        ],
        select: { testCaseId: true },
        skipDuplicates: true,
      });
      expect(tx.testRunSuite.createMany).toHaveBeenCalledWith({
        data: [
          {
            position: 2,
            testRunId: 'run-id',
            testSuiteId: 'suite-1',
            testType: TestRunTestType.FUNCIONAL,
          },
        ],
        skipDuplicates: true,
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'TEST_RUN_TESTS_ADDED',
          actorUserId: 'actor-id',
          details: expect.objectContaining({
            addedTestCaseIds: ['case-new'],
            addedTestSuiteIds: ['suite-1'],
            newTotal: 2,
            previousTotal: 1,
            testRunId: 'run-id',
          }),
        }),
      });
    });

    it('does not mutate or audit when every requested case is a duplicate', async () => {
      const { repository, tx } = setupTransaction();
      tx.testResult.findMany.mockResolvedValue([
        { testCaseId: 'case-existing' },
        { testCaseId: 'case-new' },
      ]);
      tx.testResult.count.mockReset().mockResolvedValue(2);

      await expect(
        repository.addTests('run-id', requestedCases, [], 'actor-id'),
      ).resolves.toMatchObject({
        addedCount: 0,
        ignoredDuplicateCount: 2,
        newTotal: 2,
      });
      expect(tx.testResult.createManyAndReturn).not.toHaveBeenCalled();
      expect(tx.testRun.update).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    });

    it('blocks a completed run inside the serializable transaction', async () => {
      const { repository, tx } = setupTransaction(TestRunStatus.COMPLETED);

      await expect(
        repository.addTests('run-id', requestedCases, ['suite-1'], 'actor-id'),
      ).resolves.toMatchObject({ status: 'RUN_NOT_EDITABLE', addedCount: 0 });
      expect(tx.testResult.findMany).not.toHaveBeenCalled();
      expect(tx.testResult.createManyAndReturn).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    });

    it('retries serialization conflicts so concurrent requests cannot create duplicates', async () => {
      const { repository, prisma } = setupTransaction();
      const serializationError = Object.assign(new Error('serialization conflict'), {
        code: 'P2034',
      });
      const successfulTransaction = prisma.$transaction.getMockImplementation();
      (prisma.$transaction as jest.Mock)
        .mockRejectedValueOnce(serializationError)
        .mockImplementation(successfulTransaction!);

      await expect(
        repository.addTests('run-id', requestedCases, ['suite-1'], 'actor-id'),
      ).resolves.toMatchObject({ addedCount: 1 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('propagates a late failure so Prisma rolls back every write in the transaction', async () => {
      const { repository, tx } = setupTransaction();
      (tx.auditLog.create as jest.Mock).mockRejectedValue(new Error('audit unavailable'));

      await expect(
        repository.addTests('run-id', requestedCases, ['suite-1'], 'actor-id'),
      ).rejects.toThrow('audit unavailable');
      expect(tx.testResult.createManyAndReturn).toHaveBeenCalled();
      expect(tx.testRun.update).toHaveBeenCalled();
      expect(tx.auditLog.create).toHaveBeenCalled();
    });
  });
});

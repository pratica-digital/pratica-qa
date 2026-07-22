import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TestRunStatus, TestRunTestType, UserStatus } from '@prisma/client';
import { TestRunsService } from './test-runs.service';

describe('TestRunsService', () => {
  it('orders suite assignments by their numeric persisted position before creating a run', async () => {
    const runs = { create: jest.fn().mockResolvedValue({ id: 'run-id' }) };
    const suites = {
      countByIds: jest.fn().mockResolvedValue(2),
      findPositionsByIds: jest.fn().mockResolvedValue([
        { id: 'suite-b', position: 12 },
        { id: 'suite-a', position: 2 },
      ]),
    };
    const users = {
      findById: jest.fn().mockResolvedValue({
        deletedAt: null,
        id: 'user-id',
        status: UserStatus.ACTIVE,
      }),
    };
    const service = new TestRunsService(
      runs as never,
      {} as never,
      suites as never,
      users as never,
      {} as never,
    );

    await service.create({
      assignedToId: 'user-id',
      name: 'Run',
      testTypes: [
        {
          type: TestRunTestType.FUNCIONAL,
          suites: ['suite-b', 'suite-a'],
        },
      ],
    });

    expect(runs.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Run' }), [
      { suiteId: 'suite-a', testType: TestRunTestType.FUNCIONAL },
      { suiteId: 'suite-b', testType: TestRunTestType.FUNCIONAL },
    ]);
  });

  it('creates a run with multiple distinct test types', async () => {
    const runs = { create: jest.fn().mockResolvedValue({ id: 'run-id' }) };
    const suites = {
      countByIds: jest.fn().mockResolvedValue(2),
      findPositionsByIds: jest.fn().mockResolvedValue([
        { id: 'suite-a', position: 1 },
        { id: 'suite-b', position: 2 },
      ]),
    };
    const users = {
      findById: jest.fn().mockResolvedValue({ deletedAt: null, status: UserStatus.ACTIVE }),
    };
    const service = new TestRunsService(
      runs as never,
      {} as never,
      suites as never,
      users as never,
      {} as never,
    );

    await service.create({
      assignedToId: 'user-id',
      name: 'Run',
      testTypes: [
        { type: TestRunTestType.SMOKE, suites: ['suite-a'] },
        { type: TestRunTestType.REGRESSAO, suites: ['suite-b'] },
      ],
    });

    expect(runs.create).toHaveBeenCalledWith(expect.anything(), [
      { suiteId: 'suite-a', testType: TestRunTestType.SMOKE },
      { suiteId: 'suite-b', testType: TestRunTestType.REGRESSAO },
    ]);
  });

  it('rejects duplicated test types during creation', async () => {
    const service = new TestRunsService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.create({
        assignedToId: 'user-id',
        name: 'Run',
        testTypes: [
          { type: TestRunTestType.SMOKE, suites: ['suite-a'] },
          { type: TestRunTestType.SMOKE, suites: ['suite-b'] },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates multiple test types while preserving the suites in the run', async () => {
    const runs = {
      findById: jest.fn().mockResolvedValue({
        deletedAt: null,
        id: 'run-id',
        suites: [
          { testSuiteId: 'suite-a' },
          { testSuiteId: 'suite-b' },
        ],
      }),
      update: jest.fn().mockResolvedValue({ id: 'run-id' }),
    };
    const service = new TestRunsService(
      runs as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const testTypes = [
      { type: TestRunTestType.SMOKE, suites: ['suite-a'] },
      { type: TestRunTestType.REGRESSAO, suites: ['suite-b'] },
    ];

    await service.update('run-id', { testTypes });

    expect(runs.update).toHaveBeenCalledWith('run-id', { testTypes }, [
      { suiteId: 'suite-a', testType: TestRunTestType.SMOKE },
      { suiteId: 'suite-b', testType: TestRunTestType.REGRESSAO },
    ]);
  });

  it('rejects type edits that add or remove suites from the execution', async () => {
    const runs = {
      findById: jest.fn().mockResolvedValue({
        deletedAt: null,
        id: 'run-id',
        suites: [{ testSuiteId: 'suite-a' }],
      }),
      update: jest.fn(),
    };
    const service = new TestRunsService(
      runs as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.update('run-id', {
        testTypes: [{ type: TestRunTestType.SMOKE, suites: ['suite-b'] }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(runs.update).not.toHaveBeenCalled();
  });

  describe('addTests', () => {
    const selectedCases = [
      {
        id: 'case-1',
        position: 1,
        suiteId: 'suite-1',
        suitePosition: 1,
      },
      {
        id: 'case-2',
        position: 2,
        suiteId: 'suite-1',
        suitePosition: 1,
      },
    ];

    function setup(status: TestRunStatus = TestRunStatus.PENDING) {
      const runs = {
        addTests: jest.fn().mockResolvedValue({
          status: 'ADDED',
          previousTotal: 1,
          newTotal: 3,
          addedCount: 2,
          ignoredDuplicateCount: 0,
          addedTestCaseIds: ['case-1', 'case-2'],
          ignoredTestCaseIds: [],
        }),
        findById: jest.fn().mockResolvedValue({
          deletedAt: null,
          id: 'run-id',
          projectId: 'project-id',
          status,
        }),
        findSelectableTests: jest.fn().mockResolvedValue({
          suiteIds: ['suite-1'],
          testCases: selectedCases,
        }),
      };
      const service = new TestRunsService(
        runs as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );

      return { runs, service };
    }

    it.each([TestRunStatus.PENDING, TestRunStatus.IN_PROGRESS])(
      'adds suites and individual cases to a %s run',
      async (status) => {
        const { runs, service } = setup(status);

        await expect(
          service.addTests('run-id', { testSuiteIds: ['suite-1'], testCaseIds: ['case-2'] }, {
            id: 'actor-id',
          } as never),
        ).resolves.toMatchObject({ addedCount: 2, newTotal: 3 });
        expect(runs.findSelectableTests).toHaveBeenCalledWith(
          ['suite-1'],
          ['case-2'],
          'project-id',
        );
        expect(runs.addTests).toHaveBeenCalledWith(
          'run-id',
          selectedCases,
          ['suite-1'],
          'actor-id',
        );
      },
    );

    it('rejects a completed run before resolving the selection', async () => {
      const { runs, service } = setup(TestRunStatus.COMPLETED);

      await expect(
        service.addTests('run-id', { testCaseIds: ['case-1'] }, { id: 'actor-id' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(runs.findSelectableTests).not.toHaveBeenCalled();
    });

    it('combines cases from multiple suites in one operation', async () => {
      const { runs, service } = setup();
      const casesFromMultipleSuites = [
        selectedCases[0],
        { ...selectedCases[1], id: 'case-3', suiteId: 'suite-2', suitePosition: 2 },
      ];
      runs.findSelectableTests.mockResolvedValue({
        suiteIds: ['suite-1', 'suite-2'],
        testCases: casesFromMultipleSuites,
      });

      await service.addTests('run-id', { testSuiteIds: ['suite-1', 'suite-2'] }, {
        id: 'actor-id',
      } as never);

      expect(runs.addTests).toHaveBeenCalledWith(
        'run-id',
        casesFromMultipleSuites,
        ['suite-1', 'suite-2'],
        'actor-id',
      );
    });

    it('rejects an empty selection', async () => {
      const { service } = setup();

      await expect(
        service.addTests('run-id', {}, { id: 'actor-id' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([
      [{ testSuiteIds: ['missing-suite'] }, { suiteIds: [], testCases: [] }],
      [{ testCaseIds: ['missing-case'] }, { suiteIds: [], testCases: [] }],
    ])('rejects unavailable suites or cases', async (dto, selection) => {
      const { runs, service } = setup();
      runs.findSelectableTests.mockResolvedValue(selection);

      await expect(
        service.addTests('run-id', dto, { id: 'actor-id' } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(runs.addTests).not.toHaveBeenCalled();
    });

    it('maps a status change detected inside the transaction to a conflict', async () => {
      const { runs, service } = setup(TestRunStatus.IN_PROGRESS);
      runs.addTests.mockResolvedValue({ status: 'RUN_NOT_EDITABLE' });

      await expect(
        service.addTests('run-id', { testCaseIds: ['case-1'] }, { id: 'actor-id' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects an unknown test run', async () => {
      const { runs, service } = setup();
      runs.findById.mockResolvedValue(null);

      await expect(
        service.addTests('missing-run', { testCaseIds: ['case-1'] }, { id: 'actor-id' } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(runs.addTests).not.toHaveBeenCalled();
    });
  });
});

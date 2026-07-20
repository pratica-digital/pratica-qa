import { TestRunTestType, UserStatus } from '@prisma/client';
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
});

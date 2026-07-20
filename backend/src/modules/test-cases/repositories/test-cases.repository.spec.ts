import { TestCasesRepository } from './test-cases.repository';

describe('TestCasesRepository', () => {
  it('uses the same filters for the paginated list and its counter', async () => {
    const prisma = {
      testCase: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new TestCasesRepository(prisma as never);
    const filters = {
      projectId: 'project-id',
      search: 'receita',
      status: undefined,
      suiteId: 'suite-id',
      tag: undefined,
      severity: undefined,
    };

    await repository.findMany({ ...filters, skip: 100, take: 100 });
    await repository.count(filters);

    const listWhere = prisma.testCase.findMany.mock.calls[0][0].where;
    const countWhere = prisma.testCase.count.mock.calls[0][0].where;

    expect(countWhere).toEqual(listWhere);
    expect(listWhere).toMatchObject({
      deletedAt: null,
      suiteId: 'suite-id',
      suite: {
        deletedAt: null,
        OR: [
          { projects: { some: { id: 'project-id', deletedAt: null } } },
          { projects: { none: {} } },
        ],
      },
    });
    expect(prisma.testCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 100,
        take: 100,
      }),
    );
  });

  it('persists a move to another suite', async () => {
    const tx = {
      testCase: {
        aggregate: jest.fn().mockResolvedValue({ _max: { position: 7 } }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'case-id', suiteId: 'suite-1' }),
        update: jest.fn().mockResolvedValue({ id: 'case-id', suiteId: 'suite-2' }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new TestCasesRepository(prisma as never);

    await repository.update('case-id', { suiteId: 'suite-2' });

    expect(tx.testCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 8, suiteId: 'suite-2' }),
        where: { id: 'case-id' },
      }),
    );
  });

  it('soft deletes and archives a test case', async () => {
    const prisma = {
      testCase: { update: jest.fn().mockResolvedValue({ id: 'case-id' }) },
    };
    const repository = new TestCasesRepository(prisma as never);

    await repository.delete('case-id');

    expect(prisma.testCase.update).toHaveBeenCalledWith({
      where: { id: 'case-id' },
      data: { deletedAt: expect.any(Date), status: 'ARCHIVED' },
    });
  });
});

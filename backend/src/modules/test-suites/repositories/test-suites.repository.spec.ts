import { TestSuitesRepository } from './test-suites.repository';

describe('TestSuitesRepository', () => {
  it('imports every normalized case into the requested suite', async () => {
    const tx = {
      testCase: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      testStep: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new TestSuitesRepository(prisma as never);
    const rows = [
      { description: '', expectedResult: '', rowNumber: 2, section: '', steps: [], title: 'Caso A' },
      { description: '', expectedResult: '', rowNumber: 3, section: '', steps: [], title: 'Caso B' },
    ];

    await expect(repository.importTestCases('suite-id', rows)).resolves.toMatchObject({ imported: 2 });

    const createdRows = tx.testCase.createMany.mock.calls[0][0].data;
    expect(createdRows).toHaveLength(2);
    expect(createdRows.every((row: { suiteId: string }) => row.suiteId === 'suite-id')).toBe(true);
  });
});

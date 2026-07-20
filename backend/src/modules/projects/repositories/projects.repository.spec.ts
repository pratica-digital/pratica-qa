import { ProjectsRepository } from './projects.repository';

describe('ProjectsRepository', () => {
  it('uses the same active-record filter for list and count', async () => {
    const prisma = {
      project: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new ProjectsRepository(prisma as never);

    await repository.findMany({ search: 'TSi', status: undefined, skip: 0, take: 25 });
    await repository.count('TSi');

    expect(prisma.project.findMany.mock.calls[0][0].where)
      .toEqual(prisma.project.count.mock.calls[0][0].where);
    expect(prisma.project.count.mock.calls[0][0].where).toMatchObject({ deletedAt: null });
  });

  it('soft deletes the project and its dependent active records', async () => {
    const tx = {
      project: { update: jest.fn().mockResolvedValue({ id: 'project-id' }) },
      testCase: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      testPlan: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      testRun: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      testSuite: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new ProjectsRepository(prisma as never);

    await repository.delete('project-id');

    expect(tx.project.update).toHaveBeenCalledWith({
      where: { id: 'project-id' },
      data: expect.objectContaining({ deletedAt: expect.any(Date), status: 'ARCHIVED' }),
    });
    expect(tx.testCase.updateMany).toHaveBeenCalled();
    expect(tx.testPlan.updateMany).toHaveBeenCalled();
    expect(tx.testRun.updateMany).toHaveBeenCalled();
    expect(tx.testSuite.updateMany).toHaveBeenCalled();
  });
});

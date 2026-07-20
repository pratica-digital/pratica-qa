import { TestSuitesService } from './test-suites.service';

describe('TestSuitesService', () => {
  it('keeps pagination and filters aligned between suite list and count', async () => {
    const suites = {
      count: jest.fn().mockResolvedValue(264),
      findMany: jest.fn().mockResolvedValue([]),
    };
    const service = new TestSuitesService(suites as never, {} as never);

    await expect(service.findAll({ page: 3, limit: 25, projectId: 'project-id', search: 'forno' }))
      .resolves.toMatchObject({ meta: { limit: 25, page: 3, total: 264 } });
    expect(suites.findMany).toHaveBeenCalledWith({
      projectId: 'project-id',
      search: 'forno',
      skip: 50,
      take: 25,
    });
    expect(suites.count).toHaveBeenCalledWith('project-id', 'forno');
  });
});

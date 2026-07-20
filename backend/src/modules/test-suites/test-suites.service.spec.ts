import { TestSuitesService } from './test-suites.service';

describe('TestSuitesService', () => {
  it('creates a suite linked to multiple projects', async () => {
    const suites = {
      create: jest.fn().mockResolvedValue({ id: 'suite-id' }),
    };
    const projects = {
      countByIds: jest.fn().mockResolvedValue(2),
    };
    const service = new TestSuitesService(suites as never, projects as never);
    const dto = {
      name: 'Fluxo compartilhado',
      projectIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
    };

    await service.create(dto);

    expect(projects.countByIds).toHaveBeenCalledWith(dto.projectIds);
    expect(suites.create).toHaveBeenCalledWith(dto, dto.projectIds);
  });

  it('keeps pagination and filters aligned between suite list and count', async () => {
    const suites = {
      count: jest.fn().mockResolvedValue(264),
      findMany: jest.fn().mockResolvedValue([]),
    };
    const service = new TestSuitesService(suites as never, {} as never);

    await expect(
      service.findAll({ page: 3, limit: 25, projectId: 'project-id', search: 'forno' }),
    ).resolves.toMatchObject({ meta: { limit: 25, page: 3, total: 264 } });
    expect(suites.findMany).toHaveBeenCalledWith({
      projectId: 'project-id',
      search: 'forno',
      skip: 50,
      take: 25,
    });
    expect(suites.count).toHaveBeenCalledWith('project-id', 'forno');
  });

  it('persists a complete case order for a suite', async () => {
    const suites = {
      findById: jest.fn().mockResolvedValue({ id: 'suite-id' }),
      findActiveCaseIds: jest.fn().mockResolvedValue(['case-a', 'case-b']),
      reorderCases: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TestSuitesService(suites as never, {} as never);

    await service.reorderCases('suite-id', { caseIds: ['case-b', 'case-a'] });

    expect(suites.reorderCases).toHaveBeenCalledWith('suite-id', ['case-b', 'case-a']);
  });

  it('rejects incomplete case ordering', async () => {
    const suites = {
      findById: jest.fn().mockResolvedValue({ id: 'suite-id' }),
      findActiveCaseIds: jest.fn().mockResolvedValue(['case-a', 'case-b']),
      reorderCases: jest.fn(),
    };
    const service = new TestSuitesService(suites as never, {} as never);

    await expect(service.reorderCases('suite-id', { caseIds: ['case-a'] })).rejects.toThrow(
      'Case order must contain every active test case in the suite exactly once',
    );
    expect(suites.reorderCases).not.toHaveBeenCalled();
  });
});

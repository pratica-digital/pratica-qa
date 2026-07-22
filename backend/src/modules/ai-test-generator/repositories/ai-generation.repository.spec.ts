import { AiGenerationRepository } from './ai-generation.repository';

const generation = {
  id: 'generation-id',
  releaseTitle: 'Release 2.4',
  fileName: 'release.pdf',
  releaseHash: 'hash',
  releaseText: 'notes',
  analysis: {},
  testCases: [{ id: 'case-1' }, { id: 'case-2' }],
  regressionSuite: [],
  coverage: {},
  provider: 'provider',
  model: 'model',
  status: 'COMPLETED',
  durationMs: 42000,
  casesCreated: 1,
  createdById: 'user-id',
  errorMessage: '',
  createdAt: new Date('2026-07-22T10:00:00Z'),
  updatedAt: new Date('2026-07-22T10:00:00Z'),
  createdBy: { name: 'Aline Silva', email: 'aline@example.com' },
};

describe('AiGenerationRepository history', () => {
  it('loads the creator in the same list query and maps generated/saved counts', async () => {
    const prisma = {
      aiGeneration: {
        findMany: jest.fn().mockResolvedValue([generation]),
      },
    };
    const repository = new AiGenerationRepository(prisma as never);

    await expect(repository.list({ skip: 0, take: 20 })).resolves.toMatchObject([
      {
        createdBy: generation.createdBy,
        casesCreated: 1,
        testCaseCount: 2,
      },
    ]);
    expect(prisma.aiGeneration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          createdBy: { select: { name: true, email: true } },
        },
      }),
    );
  });

  it('deletes only the generation record', async () => {
    const prisma = {
      aiGeneration: {
        delete: jest.fn().mockResolvedValue(generation),
      },
    };
    const repository = new AiGenerationRepository(prisma as never);

    await repository.remove('generation-id');

    expect(prisma.aiGeneration.delete).toHaveBeenCalledWith({
      where: { id: 'generation-id' },
    });
    expect(Object.keys(prisma)).toEqual(['aiGeneration']);
  });
});

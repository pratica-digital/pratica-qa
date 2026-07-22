import { NotFoundException } from '@nestjs/common';
import { AiTestGeneratorService } from './ai-test-generator.service';

describe('AiTestGeneratorService history removal', () => {
  function setup(generation: object | null) {
    const generationRepository = {
      findById: jest.fn().mockResolvedValue(generation),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AiTestGeneratorService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      generationRepository as never,
      {} as never,
    );

    return { generationRepository, service };
  }

  it('deletes an existing generation only through its repository', async () => {
    const { generationRepository, service } = setup({
      id: 'generation-id',
      createdById: 'user-id',
      releaseTitle: 'Release 2.4',
    });

    await expect(service.removeHistory('generation-id')).resolves.toBeUndefined();
    expect(generationRepository.remove).toHaveBeenCalledWith('generation-id');
  });

  it('returns not found and does not delete when the generation does not exist', async () => {
    const { generationRepository, service } = setup(null);

    await expect(service.removeHistory('missing-id')).rejects.toBeInstanceOf(NotFoundException);
    expect(generationRepository.remove).not.toHaveBeenCalled();
  });
});

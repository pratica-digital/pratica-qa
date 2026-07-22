import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { AiTestGeneratorController } from './ai-test-generator.controller';

describe('AiTestGeneratorController history removal', () => {
  it('restricts deletion to administrators', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AiTestGeneratorController.prototype.removeHistory,
    );

    expect(roles).toEqual([UserRole.ADMIN]);
    expect(roles).not.toContain(UserRole.QA);
  });

  it('delegates deletion to the service', async () => {
    const service = { removeHistory: jest.fn().mockResolvedValue(undefined) };
    const controller = new AiTestGeneratorController(service as never, {} as never);

    await expect(controller.removeHistory('generation-id')).resolves.toBeUndefined();
    expect(service.removeHistory).toHaveBeenCalledWith('generation-id');
  });
});

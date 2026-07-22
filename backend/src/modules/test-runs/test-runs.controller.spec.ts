import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { TestRunsController } from './test-runs.controller';

describe('TestRunsController update authorization', () => {
  it('uses the same ADMIN/QA permission rule as type editing and deletion', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, TestRunsController.prototype.update),
    ).toEqual([UserRole.ADMIN, UserRole.QA]);
    expect(
      Reflect.getMetadata(ROLES_KEY, TestRunsController.prototype.remove),
    ).toEqual([UserRole.ADMIN, UserRole.QA]);
  });
});

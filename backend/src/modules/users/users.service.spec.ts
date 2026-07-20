import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('soft deletes a user when the account is deactivated', async () => {
    const existing = { id: 'user-id', deletedAt: null, status: UserStatus.ACTIVE };
    const deleted = { ...existing, deletedAt: new Date(), status: UserStatus.INACTIVE };
    const users = {
      delete: jest.fn().mockResolvedValue(deleted),
      findById: jest.fn().mockResolvedValue(existing),
      toPublicUser: jest.fn((user) => user),
    };
    const audit = { logAdminAction: jest.fn().mockResolvedValue(undefined) };
    const service = new UsersService(users as never, audit as never, {} as never, {} as never);

    await expect(service.deactivate('user-id', { id: 'admin-id' } as never)).resolves.toEqual(deleted);

    expect(users.delete).toHaveBeenCalledWith('user-id');
    expect(audit.logAdminAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'USER_DEACTIVATED',
      details: { softDeleted: true },
      targetUserId: 'user-id',
    }));
  });
});

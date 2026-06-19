import type { AuthUser } from '../types/testRun';

type RoleUser = Pick<AuthUser, 'role'> | null | undefined;

export function canManageTests(user: RoleUser) {
  return user?.role === 'ADMIN' || user?.role === 'QA';
}

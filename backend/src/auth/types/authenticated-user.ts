import { UserRole, UserStatus } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

import { UserRole, UserStatus } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  firstAccess: boolean;
  passwordChangedAt: Date | null;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

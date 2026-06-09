import { createContext } from 'react';
import type { AuthUser, TestRun } from '../types/testRun';

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  assignedTestRuns: TestRun[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (payload: { name: string; email: string }) => Promise<void>;
  setAssignedTestRuns: (testRuns: TestRun[]) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

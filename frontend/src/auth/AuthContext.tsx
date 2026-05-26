import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../lib/api';
import type { AuthUser, TestRun } from '../types/testRun';
import { AuthContext, type AuthContextValue } from './authContextCore';

const TOKEN_STORAGE_KEY = 'qa-platform-token';
const USER_STORAGE_KEY = 'qa-platform-user';

function readStoredUser() {
  const stored = window.localStorage.getItem(USER_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const [assignedTestRuns, setAssignedTestRuns] = useState<TestRun[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setAssignedTestRuns([]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    authApi
      .me(token)
      .then((currentUser) => {
        if (!isMounted) {
          return;
        }

        setUser(currentUser);
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      })
      .catch(() => {
        if (isMounted) {
          clearSession();
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clearSession, token]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);

    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      assignedTestRuns,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout: clearSession,
      setAssignedTestRuns,
    }),
    [assignedTestRuns, clearSession, isLoading, login, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

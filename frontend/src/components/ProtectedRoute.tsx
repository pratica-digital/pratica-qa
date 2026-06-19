import type { ReactNode } from 'react';
import { FirstAccessPasswordPage } from '../auth/FirstAccessPasswordPage';
import { LoginPage } from '../auth/LoginPage';
import { useAuth } from '../auth/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading workspace
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (user?.firstAccess) {
    return <FirstAccessPasswordPage />;
  }

  return children;
}

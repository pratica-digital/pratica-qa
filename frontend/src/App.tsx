import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './auth/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    </AuthProvider>
  );
}

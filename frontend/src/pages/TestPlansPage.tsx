import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { ApiError, testPlansApi } from '../lib/api';
import type { TestPlan } from '../types/testRun';
import NewTestPlanModal from './NewTestPlanModal';

export function TestPlansPage() {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const list = await testPlansApi.list(token);
      setPlans(list);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Sign out and sign in again.');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to load test plans.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const t = window.setTimeout(() => void fetchData(), 0);
    return () => window.clearTimeout(t);
  }, [fetchData]);

  function handleCreated(plan: TestPlan) {
    setPlans((current) => [plan, ...current]);
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">Test plans</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-950">Test Plans</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm"
            onClick={() => void fetchData()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm text-white"
            onClick={() => setModalOpen(true)}
            disabled={!isAdmin}
            title={!isAdmin ? 'Only admins can create test plans' : 'Create test plan'}
          >
            <Plus className="h-4 w-4" /> New plan
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border p-8 text-center">Loading test plans</div>
      ) : plans.length > 0 ? (
        <div className="grid gap-3">
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-lg border p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">{plan.name}</h2>
                  <p className="text-xs text-zinc-500">v{plan.version}</p>
                </div>
                <div className="text-xs text-zinc-400">{new Date(plan.createdAt).toLocaleString()}</div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border p-8 text-center">No test plans found</div>
      )}

      <NewTestPlanModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </div>
  );
}

export default TestPlansPage;

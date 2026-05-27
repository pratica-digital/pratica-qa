import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { TestPlanEditPanel } from '../components/test-plan/TestPlanEditPanel';
import { ApiError, testPlansApi } from '../lib/api';
import type { TestPlan, UpdateTestPlanPayload } from '../types/testRun';
import NewTestPlanModal from './NewTestPlanModal';

export function TestPlansPage() {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
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
    setSuccess('Test plan created.');
  }

  async function handleSavePlan(testPlan: TestPlan, payload: UpdateTestPlanPayload) {
    if (!token) {
      throw new Error('Authentication is required.');
    }

    const updatedPlan = await testPlansApi.update(token, testPlan.id, payload);

    setPlans((current) =>
      current.map((item) => (item.id === testPlan.id ? updatedPlan : item)),
    );
    setEditingPlan(updatedPlan);
    setSuccess('Test plan updated.');
  }

  const isAdmin = user?.role === 'ADMIN';

  function formatCreatedAt(createdAt?: string) {
    return createdAt ? new Date(createdAt).toLocaleString() : 'Recently created';
  }

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

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border p-8 text-center">Loading test plans</div>
      ) : plans.length > 0 ? (
        <div className="grid gap-3">
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-lg border p-4 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">{plan.name}</h2>
                  <p className="text-xs text-zinc-500">
                    v{plan.version} - {plan.sections?.length ?? 0} sections
                  </p>
                  {plan.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{plan.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="hidden text-xs text-zinc-400 sm:block">{formatCreatedAt(plan.createdAt)}</div>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    onClick={() => setEditingPlan(plan)}
                    title={isAdmin ? 'Edit test plan' : 'View test plan'}
                    type="button"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border p-8 text-center">No test plans found</div>
      )}

      <NewTestPlanModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />

      {editingPlan ? (
        <TestPlanEditPanel
          key={editingPlan.id}
          onClose={() => setEditingPlan(null)}
          onSave={handleSavePlan}
          readOnly={!isAdmin}
          testPlan={editingPlan}
        />
      ) : null}
    </div>
  );
}

export default TestPlansPage;

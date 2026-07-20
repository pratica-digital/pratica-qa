import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { canManageTests } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { ActionMenu } from '../components/ActionMenu';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { MarkdownContent } from '../components/MarkdownContent';
import { TestPlanDetailPanel } from '../components/test-plan/TestPlanDetailPanel';
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
  const [selectedPlan, setSelectedPlan] = useState<TestPlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null);
  const [planPendingDelete, setPlanPendingDelete] = useState<TestPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        setError('Sua sessão expirou. Saia e entre novamente.');
      } else {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os planos de teste.');
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
    setSuccess('Plano de teste criado.');
  }

  async function handleOpenPlan(plan: TestPlan) {
    if (!token) {
      setSelectedPlan(plan);
      return;
    }

    try {
      const freshPlan = await testPlansApi.get(token, plan.id);
      setSelectedPlan(freshPlan);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Não foi possível carregar o plano de teste.');
    }
  }

  async function handleSavePlan(testPlan: TestPlan, payload: UpdateTestPlanPayload) {
    if (!token) {
      throw new Error('Autenticação obrigatória.');
    }

    const updatedPlan = await testPlansApi.update(token, testPlan.id, payload);

    setPlans((current) =>
      current.map((item) => (item.id === testPlan.id ? updatedPlan : item)),
    );
    setEditingPlan(updatedPlan);
    setSuccess('Plano de teste atualizado.');
  }

  function requestPlanDelete(testPlan: TestPlan) {
    setError('');
    setSuccess('');
    setPlanPendingDelete(testPlan);
  }

  async function handleDeletePlan() {
    if (!token || !planPendingDelete) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await testPlansApi.remove(token, planPendingDelete.id);
      setPlans((current) => current.filter((plan) => plan.id !== planPendingDelete.id));

      if (selectedPlan?.id === planPendingDelete.id) {
        setSelectedPlan(null);
      }

      if (editingPlan?.id === planPendingDelete.id) {
        setEditingPlan(null);
      }

      setPlanPendingDelete(null);
      setSuccess('Plano de teste excluído.');
    } catch (deleteError) {
      setPlanPendingDelete(null);
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o plano de teste.');
    } finally {
      setIsDeleting(false);
    }
  }

  const canManageTestAssets = canManageTests(user);

  function formatCreatedAt(createdAt?: string) {
    return createdAt ? new Date(createdAt).toLocaleString('pt-BR') : 'Criado recentemente';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Planos de Teste</h1>
          <p className="text-sm font-medium text-slate-500">Definir a estratégia, escopo e abordagem dos testes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm"
            onClick={() => void fetchData()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" /> 
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-3 text-sm text-white"
            onClick={() => setModalOpen(true)}
            disabled={!canManageTestAssets}
            title={!canManageTestAssets ? 'Requer permissão de gestão de testes' : 'Criar plano de teste'}
          >
            <Plus className="h-4 w-4" /> Novo plano
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border p-8 text-center">Carregando planos de teste</div>
      ) : plans.length > 0 ? (
        <div className="grid gap-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="cursor-pointer rounded-lg border bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={() => void handleOpenPlan(plan)}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">{plan.name}</h2>
                  <p className="text-xs text-slate-500">
                    v{plan.version} - {plan.sections?.length ?? 0} seção{(plan.sections?.length ?? 0) === 1 ? '' : 'ões'}
                  </p>
                  {plan.description ? (
                    <MarkdownContent className="mt-2 line-clamp-2 text-sm text-slate-600" content={plan.description} />
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="hidden text-xs text-slate-400 sm:block">{formatCreatedAt(plan.createdAt)}</div>
                  <ActionMenu
                    ariaLabel="Ações do plano de teste"
                    items={[
                      {
                        label: canManageTestAssets ? 'Editar' : 'Visualizar',
                        onSelect: () => setEditingPlan(plan),
                        title: canManageTestAssets ? 'Editar plano de teste' : 'Visualizar plano de teste',
                      },
                      {
                        disabled: !canManageTestAssets,
                        label: 'Excluir',
                        onSelect: () => requestPlanDelete(plan),
                        title: canManageTestAssets
                          ? 'Excluir plano de teste'
                          : 'Requer permissão de gestão de testes',
                        tone: 'danger',
                      },
                    ]}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border p-8 text-center">Nenhum plano de teste encontrado</div>
      )}

      <NewTestPlanModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />

      {selectedPlan ? (
        <TestPlanDetailPanel
          onClose={() => setSelectedPlan(null)}
          onDelete={canManageTestAssets ? () => requestPlanDelete(selectedPlan) : undefined}
          onEdit={() => {
            setEditingPlan(selectedPlan);
            setSelectedPlan(null);
          }}
          testPlan={selectedPlan}
        />
      ) : null}

      {editingPlan ? (
        <TestPlanEditPanel
          key={editingPlan.id}
          onClose={() => setEditingPlan(null)}
          onSave={handleSavePlan}
          readOnly={!canManageTestAssets}
          testPlan={editingPlan}
        />
      ) : null}

      {planPendingDelete ? (
        <DeleteConfirmationModal
          description="Isto removerá o plano de teste e desvinculará as informações de planejamento relacionadas de execuções futuras."
          loading={isDeleting}
          onCancel={() => setPlanPendingDelete(null)}
          onConfirm={() => void handleDeletePlan()}
          title="Excluir plano de teste?"
        />
      ) : null}
    </div>
  );
}

export default TestPlansPage;

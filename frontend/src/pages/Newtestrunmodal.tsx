import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Layers3,
  Play,
  UserRound,
  X,
} from 'lucide-react';
import type {
  AuthUser,
  ManagedTestSuite,
  TestPlan,
  TestRun,
  TestRunTestType,
} from '../types/testRun';
import { useAuth } from '../auth/useAuth';
import { testPlansApi, testRunsApi, testSuitesApi } from '../lib/api';
import { suiteProjectLabel } from '../lib/labels';

type SuiteOption = ManagedTestSuite;
type TabId = 'info' | 'suites';

type ProjectReference = {
  id?: string;
  key?: string;
  name?: string;
};

type TestRunForm = {
  name: string;
  planId: string;
  assignedToId: string;
  scheduledAt: string;
};

type TestRunFormErrors = Partial<Record<keyof TestRunForm | 'suites' | 'testTypes', string>>;

type FieldProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
};

type NewTestRunModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate?: (testRun: TestRun) => void;
  qaUsers?: AuthUser[];
  projectId?: string;
};

const initialForm: TestRunForm = {
  name: '',
  planId: '',
  assignedToId: '',
  scheduledAt: '',
};

const TEST_TYPE_OPTIONS: Array<{
  type: TestRunTestType;
  label: string;
  description: string;
}> = [
  {
    type: 'SMOKE',
    label: 'Smoke',
    description: 'Checagens críticas antes da execução detalhada',
  },
  {
    type: 'FUNCIONAL',
    label: 'Funcional',
    description: 'Comportamento das funcionalidades e cobertura de aceite',
  },
  {
    type: 'REGRESSAO',
    label: 'Regressão',
    description: 'Fluxos existentes que precisam continuar funcionando',
  },
  {
    type: 'ROBUSTEZ',
    label: 'Robustez',
    description: 'Cenários de limite, resiliência e estresse',
  },
];

function Field({ label, required = false, children, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-blue-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      {...props}
    />
  );
}

function getTestTypeOption(type: TestRunTestType) {
  return TEST_TYPE_OPTIONS.find((option) => option.type === type) || TEST_TYPE_OPTIONS[0];
}

function getProjectLabel(project?: ProjectReference | null, fallbackId?: string | null) {
  if (project?.name && project.key) {
    return `${project.name} (${project.key})`;
  }

  return project?.name || project?.key || fallbackId || 'Projeto não identificado';
}

function getPlanProjectLabel(plan: TestPlan) {
  return getProjectLabel(plan.project, plan.projectId);
}

function getSuiteProjectLabel(suite: SuiteOption) {
  return suiteProjectLabel(suite);
}

export function NewTestRunModal({ open, onClose, onCreate, qaUsers = [], projectId }: NewTestRunModalProps) {
  const { token } = useAuth();
  const [form, setForm] = useState<TestRunForm>(initialForm);
  const [selectedTestTypes, setSelectedTestTypes] = useState<TestRunTestType[]>([]);
  const [suiteAssignments, setSuiteAssignments] = useState<Partial<Record<string, TestRunTestType>>>({});
  const [errors, setErrors] = useState<TestRunFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [suites, setSuites] = useState<SuiteOption[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState('');

  const assigneeOptions = qaUsers;

  useEffect(() => {
    if (!open || !token) {
      return;
    }

    const loadData = async () => {
      setIsLoadingData(true);
      setLoadError('');

      try {
        const [plansList, suitesList] = await Promise.all([
          testPlansApi.list(token, { limit: 100, projectId }),
          testSuitesApi.list(token, { limit: 100, projectId }),
        ]);

        setTestPlans(plansList);
        setSuites(suitesList);
      } catch (loadError) {
        setLoadError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [open, token, projectId]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function setField<Field extends keyof TestRunForm>(field: Field, value: TestRunForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handlePlanChange(planId: string) {
    const nextPlan = testPlans.find((plan) => plan.id === planId);
    const nextProjectId = projectId || nextPlan?.projectId;

    setForm((current) => ({ ...current, planId }));
    setSuiteAssignments((current) => {
      if (!nextProjectId) {
        return {};
      }

      return Object.entries(current).reduce<Partial<Record<string, TestRunTestType>>>(
        (nextAssignments, [suiteId, assignedType]) => {
          const suite = suites.find((suiteOption) => suiteOption.id === suiteId);

          if (suite && (!suite.projectId || suite.projectId === nextProjectId)) {
            nextAssignments[suiteId] = assignedType;
          }

          return nextAssignments;
        },
        {},
      );
    });
    setErrors((current) => ({ ...current, planId: undefined, suites: undefined }));
  }

  function toggleTestType(type: TestRunTestType) {
    setSelectedTestTypes((current) =>
      current.includes(type) ? current.filter((testType) => testType !== type) : [...current, type],
    );

    setSuiteAssignments((current) => {
      const next = { ...current };

      for (const [suiteId, assignedType] of Object.entries(current)) {
        if (assignedType === type) {
          delete next[suiteId];
        }
      }

      return next;
    });

    setErrors((current) => ({ ...current, suites: undefined, testTypes: undefined }));
  }

  function assignSuiteToType(type: TestRunTestType, suiteId: string) {
    if (!suiteId) {
      return;
    }

    setSuiteAssignments((current) => ({ ...current, [suiteId]: type }));
    setErrors((current) => ({ ...current, suites: undefined }));
  }

  function removeSuiteAssignment(suiteId: string) {
    setSuiteAssignments((current) => {
      const next = { ...current };
      delete next[suiteId];
      return next;
    });
  }

  function clearTypeSuites(type: TestRunTestType) {
    setSuiteAssignments((current) => {
      const next = { ...current };

      for (const [suiteId, assignedType] of Object.entries(current)) {
        if (assignedType === type) {
          delete next[suiteId];
        }
      }

      return next;
    });
  }

  function validate() {
    const nextErrors: TestRunFormErrors = {};
    const selectedPlan = testPlans.find((plan) => plan.id === form.planId);
    const selectedProjectId = projectId || selectedPlan?.projectId;

    if (!form.name.trim()) {
      nextErrors.name = 'Nome obrigatório';
    }

    if (!form.planId) {
      nextErrors.planId = 'Selecione um plano de teste';
    }

    if (projectId && selectedPlan && selectedPlan.projectId !== projectId) {
      nextErrors.planId = 'Selecione um plano do projeto atual';
    }

    if (!form.assignedToId) {
      nextErrors.assignedToId = 'Selecione um responsável';
    }

    if (selectedTestTypes.length === 0) {
      nextErrors.testTypes = 'Selecione pelo menos um tipo de teste';
    }

    const hasSuiteOutsideSelectedTypes = Object.values(suiteAssignments).some(
      (type) => type && !selectedTestTypes.includes(type),
    );

    if (hasSuiteOutsideSelectedTypes) {
      nextErrors.suites = 'Toda suíte deve estar vinculada a um tipo de teste selecionado';
    }

    const hasSuiteOutsideProject = Boolean(selectedProjectId) && Object.keys(suiteAssignments).some((suiteId) => {
      const suite = suites.find((suiteOption) => suiteOption.id === suiteId);
      return Boolean(suite?.projectId && suite.projectId !== selectedProjectId);
    });

    if (hasSuiteOutsideProject) {
      nextErrors.suites = 'Todas as suítes devem pertencer ao projeto do plano selecionado';
    }

    return nextErrors;
  }

  async function handleSubmit() {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setActiveTab(nextErrors.suites || nextErrors.testTypes ? 'suites' : 'info');
      return;
    }

    if (!token) {
      setLoadError('Autenticação obrigatória');
      return;
    }

    setSubmitting(true);
    setLoadError('');

    try {
      const selectedSuiteOptions = suites.filter((suite) => suiteAssignments[suite.id]);
      const selectedPlan = testPlans.find((plan) => plan.id === form.planId);

      if (!selectedPlan) {
        setLoadError('Selecione um plano de teste válido.');
        setActiveTab('info');
        setSubmitting(false);
        return;
      }

      const resolvedProjectId = projectId || selectedPlan.projectId || selectedSuiteOptions[0]?.projectId;
      const testTypes = selectedTestTypes.map((type) => ({
        type,
        suites: Object.entries(suiteAssignments)
          .filter(([, assignedType]) => assignedType === type)
          .map(([suiteId]) => suiteId),
      }));

      if (!resolvedProjectId) {
        setLoadError('Selecione ao menos uma suíte vinculada a um projeto.');
        setSubmitting(false);
        return;
      }

      if (selectedPlan.projectId !== resolvedProjectId) {
        setLoadError(`O plano selecionado pertence ao projeto ${getPlanProjectLabel(selectedPlan)}.`);
        setActiveTab('info');
        setSubmitting(false);
        return;
      }

      const suitesOutsideProject = selectedSuiteOptions.filter(
        (suite) => suite.projectId && suite.projectId !== resolvedProjectId,
      );

      if (suitesOutsideProject.length > 0) {
        const suiteNames = suitesOutsideProject
          .map((suite) => `${suite.name} (${getSuiteProjectLabel(suite)})`)
          .join(', ');

        setLoadError(
          `Todas as suítes devem pertencer ao projeto ${getPlanProjectLabel(selectedPlan)}. Revise: ${suiteNames}.`,
        );
        setActiveTab('suites');
        setSubmitting(false);
        return;
      }

      const createdRun = await testRunsApi.create(token, {
        projectId: resolvedProjectId,
        testPlanId: form.planId,
        assignedToId: form.assignedToId,
        name: form.name.trim(),
        testTypes,
      });
      onCreate?.(createdRun);

      onClose();
      setForm(initialForm);
      setSelectedTestTypes([]);
      setSuiteAssignments({});
      setErrors({});
      setActiveTab('info');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível criar a execução');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPlan = testPlans.find((plan) => plan.id === form.planId);
  const activeProjectId = projectId || selectedPlan?.projectId;
  const selectableSuites = activeProjectId
    ? suites.filter((suite) => !suite.projectId || suite.projectId === activeProjectId)
    : suites;
  const selectedSuiteOptions = suites.filter((suite) => suiteAssignments[suite.id]);
  const unassignedSuites = selectableSuites.filter((suite) => !suiteAssignments[suite.id]);
  const totalCasesSelected = selectedSuiteOptions.reduce(
    (sum, suite) => sum + (suite._count?.testCases || 0),
    0,
  );

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'info', label: 'Configuração' },
    { id: 'suites', label: `Tipos (${selectedTestTypes.length})` },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Play className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-950">Nova execução</h2>
            <p className="truncate text-xs text-slate-400">Configure uma sessão de execução</p>
          </div>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            title="Fechar modal"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-5">
          {tabs.map((tab) => (
            <button
              className={`-mb-px mr-5 border-b-2 py-3 text-xs font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
              {tab.id === 'suites' && (errors.suites || errors.testTypes) ? (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                  !
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loadError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-600">
              {loadError}
            </div>
          ) : null}

          {isLoadingData ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            </div>
          ) : null}

          {/* Tab: Info */}
          {!isLoadingData && activeTab === 'info' ? (
            <div className="space-y-4">
              <Field label="Nome da execução" required>
                <Input
                  onChange={(event) => setField('name', event.target.value)}
                  placeholder="Smoke test - Release v2.4"
                  value={form.name}
                />
                {errors.name ? (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.name}
                  </p>
                ) : null}
              </Field>

              <Field label="Plano de teste" required hint="A execução será vinculada a este plano">
                <div className="relative">
                  <ClipboardList className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    disabled={isLoadingData}
                    onChange={(event) => handlePlanChange(event.target.value)}
                    value={form.planId}
                  >
                    <option value="">Selecione o plano...</option>
                    {testPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} (v{plan.version}) - Projeto: {getPlanProjectLabel(plan)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                {errors.planId ? (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.planId}
                  </p>
                ) : null}
              </Field>

              <Field label="Responsável" required hint="Usuário de QA responsável por esta execução">
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    onChange={(event) => setField('assignedToId', event.target.value)}
                    value={form.assignedToId}
                  >
                    <option value="">Selecione QA...</option>
                    {assigneeOptions.map((qaUser) => (
                      <option key={qaUser.id} value={qaUser.id}>
                        {qaUser.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                {errors.assignedToId ? (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.assignedToId}
                  </p>
                ) : null}
              </Field>

              <Field label="Data planejada" hint="Data planejada opcional para execução">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    onChange={(event) => setField('scheduledAt', event.target.value)}
                    type="date"
                    value={form.scheduledAt}
                  />
                </div>
              </Field>

            </div>
          ) : null}

          {/* Tab: Suites */}
          {!isLoadingData && activeTab === 'suites' ? (
            <div className="space-y-5">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-950">Tipos de teste</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Selecione uma ou mais estratégias de teste. As suítes são adicionadas dentro de cada tipo selecionado.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {TEST_TYPE_OPTIONS.map((option) => {
                    const isSelected = selectedTestTypes.includes(option.type);

                    return (
                      <button
                        className={`rounded-lg border p-3 text-left transition ${
                          isSelected
                            ? 'border-blue-500 bg-blue-100'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        key={option.type}
                        onClick={() => toggleTestType(option.type)}
                        type="button"
                      >
                        <span
                          className={`block text-sm font-semibold ${
                            isSelected ? 'text-blue-800' : 'text-slate-900'
                          }`}
                        >
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errors.testTypes ? (
                <p className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" /> {errors.testTypes}
                </p>
              ) : null}

              {errors.suites ? (
                <p className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" /> {errors.suites}
                </p>
              ) : null}

              {selectedTestTypes.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                  Selecione um tipo de teste para começar a organizar as suítes.
                </p>
              ) : null}

              <div className="space-y-3">
                {selectedTestTypes.map((type) => {
                  const option = getTestTypeOption(type);
                  const assignedSuites = suites.filter((suite) => suiteAssignments[suite.id] === type);
                  const assignedCaseCount = assignedSuites.reduce(
                    (sum, suite) => sum + (suite._count?.testCases || 0),
                    0,
                  );

                  return (
                    <section
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      key={type}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-950">
                            {option.label}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {assignedSuites.length} suíte(s), {assignedCaseCount} caso(s)
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative min-w-52">
                            <select
                              className="h-9 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-8 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={unassignedSuites.length === 0}
                              onChange={(event) => {
                                assignSuiteToType(type, event.target.value);
                                event.target.value = '';
                              }}
                              value=""
                            >
                              <option value="">
                                {unassignedSuites.length === 0 ? 'Nenhuma suíte disponível' : 'Adicionar suíte...'}
                              </option>
                              {unassignedSuites.map((suite) => (
                                <option key={suite.id} value={suite.id}>
                                  {suite.name} - Projeto: {getSuiteProjectLabel(suite)}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          <button
                            className="h-9 rounded-lg px-3 text-xs font-medium text-slate-500 transition hover:bg-white"
                            disabled={assignedSuites.length === 0}
                            onClick={() => clearTypeSuites(type)}
                            type="button"
                          >
                            Limpar
                          </button>
                        </div>
                      </div>

                      {assignedSuites.length === 0 ? (
                        <p className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500">
                          Este tipo ainda não possui suítes.
                        </p>
                      ) : (
                        <div className="mt-3 grid gap-2">
                          {assignedSuites.map((suite) => (
                            <div
                              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                              key={suite.id}
                            >
                              <Layers3 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-950">
                                  {suite.name}
                                </p>
                                <p className="text-xs text-slate-400">
                                   {getSuiteProjectLabel(suite)} - {suite._count?.testCases || 0} caso(s)
                                </p>
                              </div>
                              <button
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                onClick={() => removeSuiteAssignment(suite.id)}
                                title={`Remover ${suite.name}`}
                                type="button"
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              {selectedTestTypes.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-950">
                      {selectedTestTypes.length}
                    </span>{' '}
                    tipo(s) selecionado(s) com{' '}
                    <span className="font-semibold text-slate-950">
                      {selectedSuiteOptions.length}
                    </span>{' '}
                    suíte(s) e{' '}
                    <span className="font-semibold text-slate-950">
                      {totalCasesSelected}
                    </span>{' '}
                    caso(s)
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-400">
            {selectedTestTypes.length > 0
              ? `${selectedTestTypes.length} tipo(s), ${selectedSuiteOptions.length} suíte(s), ${totalCasesSelected} caso(s)`
              : 'Nenhum tipo de teste selecionado'}
          </p>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-lg bg-slate-600 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              onClick={handleSubmit}
              type="button"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Criando
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Criar execução
                </>
              )}
            </button>
          </div>
        </div>

      </div>
      </div>
    </div>,
    document.body,
  );
}

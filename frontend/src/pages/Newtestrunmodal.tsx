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
  PaginatedResponse,
  TestPlan,
  TestRun,
  TestRunTestType,
} from '../types/testRun';
import { useAuth } from '../auth/useAuth';

type SuiteOption = ManagedTestSuite;
type TabId = 'info' | 'suites';

type TestRunForm = {
  name: string;
  planId: string;
  assignedToId: string;
  description: string;
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
  description: '',
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
    description: 'Critical checks before deeper execution',
  },
  {
    type: 'FUNCIONAL',
    label: 'Funcional',
    description: 'Feature behavior and acceptance coverage',
  },
  {
    type: 'REGRESSAO',
    label: 'Regressão',
    description: 'Existing flows that must keep working',
  },
  {
    type: 'ROBUSTEZ',
    label: 'Robustez',
    description: 'Edge cases, resilience, and stress scenarios',
  },
];

function Field({ label, required = false, children, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required ? <span className="ml-1 text-sky-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-zinc-400">{hint}</p> : null}
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-sky-400"
      {...props}
    />
  );
}

function getTestTypeOption(type: TestRunTestType) {
  return TEST_TYPE_OPTIONS.find((option) => option.type === type) || TEST_TYPE_OPTIONS[0];
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
        const [plansResponse, suitesResponse] = await Promise.all([
          fetch(`http://localhost:3000/api/test-plans?limit=100`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`http://localhost:3000/api/test-suites?limit=100${projectId ? `&projectId=${projectId}` : ''}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!plansResponse.ok || !suitesResponse.ok) {
          setLoadError('Failed to load data');
          return;
        }

        const plansData = (await plansResponse.json()) as TestPlan[] | PaginatedResponse<TestPlan>;
        const suitesData = (await suitesResponse.json()) as
          | ManagedTestSuite[]
          | PaginatedResponse<ManagedTestSuite>;

        const plansList = Array.isArray(plansData) ? plansData : plansData.data || [];
        const suitesList = Array.isArray(suitesData) ? suitesData : suitesData.data || [];

        setTestPlans(plansList);
        setSuites(suitesList);
      } catch {
        setLoadError('Unable to load data');
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

    if (!form.name.trim()) {
      nextErrors.name = 'Name is required';
    }

    if (!form.planId) {
      nextErrors.planId = 'Select a test plan';
    }

    if (!form.assignedToId) {
      nextErrors.assignedToId = 'Select an assignee';
    }

    if (selectedTestTypes.length === 0) {
      nextErrors.testTypes = 'Select at least one test type';
    }

    const hasSuiteOutsideSelectedTypes = Object.values(suiteAssignments).some(
      (type) => type && !selectedTestTypes.includes(type),
    );

    if (hasSuiteOutsideSelectedTypes) {
      nextErrors.suites = 'Every suite must be linked to a selected test type';
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
      setLoadError('Authentication required');
      return;
    }

    setSubmitting(true);
    setLoadError('');

    try {
      const selectedSuiteOptions = suites.filter((suite) => suiteAssignments[suite.id]);
      const selectedPlan = testPlans.find((plan) => plan.id === form.planId);
      const testTypes = selectedTestTypes.map((type) => ({
        type,
        suites: Object.entries(suiteAssignments)
          .filter(([, assignedType]) => assignedType === type)
          .map(([suiteId]) => suiteId),
      }));

      const response = await fetch('http://localhost:3000/api/test-runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: projectId || selectedPlan?.projectId || selectedSuiteOptions[0]?.projectId,
          testPlanId: form.planId,
          assignedToId: form.assignedToId,
          name: form.name.trim(),
          description: form.description.trim(),
          testTypes,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string | string[] };
        const message = Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message;
        setLoadError(message || 'Failed to create test run');
        setSubmitting(false);
        return;
      }

      const createdRun = (await response.json()) as TestRun;
      onCreate?.(createdRun);

      onClose();
      setForm(initialForm);
      setSelectedTestTypes([]);
      setSuiteAssignments({});
      setErrors({});
      setActiveTab('info');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to create test run');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSuiteOptions = suites.filter((suite) => suiteAssignments[suite.id]);
  const unassignedSuites = suites.filter((suite) => !suiteAssignments[suite.id]);
  const totalCasesSelected = selectedSuiteOptions.reduce(
    (sum, suite) => sum + (suite._count?.testCases || 0),
    0,
  );

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'info', label: 'Setup' },
    { id: 'suites', label: `Types (${selectedTestTypes.length})` },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-white dark:bg-zinc-950">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <Play className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">New test run</h2>
            <p className="truncate text-xs text-zinc-400">Configure an execution session</p>
          </div>
          <button
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            title="Close modal"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 px-5 dark:border-zinc-800">
          {tabs.map((tab) => (
            <button
              className={`-mb-px mr-5 border-b-2 py-3 text-xs font-medium transition ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
              {tab.id === 'suites' && (errors.suites || errors.testTypes) ? (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                  !
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loadError ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400">
              {loadError}
            </div>
          ) : null}

          {isLoadingData ? (
            <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-white" />
            </div>
          ) : null}

          {/* Tab: Info */}
          {!isLoadingData && activeTab === 'info' ? (
            <div className="space-y-4">
              <Field label="Run name" required>
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

              <Field label="Test plan" required hint="The run will be linked to this test plan">
                <div className="relative">
                  <ClipboardList className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-9 pr-9 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    disabled={isLoadingData}
                    onChange={(event) => setField('planId', event.target.value)}
                    value={form.planId}
                  >
                    <option value="">Select plan...</option>
                    {testPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} (v{plan.version})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                </div>
                {errors.planId ? (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.planId}
                  </p>
                ) : null}
              </Field>

              <Field label="Assignee" required hint="QA user responsible for this run">
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-9 pr-9 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    onChange={(event) => setField('assignedToId', event.target.value)}
                    value={form.assignedToId}
                  >
                    <option value="">Select QA...</option>
                    {assigneeOptions.map((qaUser) => (
                      <option key={qaUser.id} value={qaUser.id}>
                        {qaUser.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                </div>
                {errors.assignedToId ? (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.assignedToId}
                  </p>
                ) : null}
              </Field>

              <Field label="Planned date" hint="Optional planned execution date">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    onChange={(event) => setField('scheduledAt', event.target.value)}
                    type="date"
                    value={form.scheduledAt}
                  />
                </div>
              </Field>

              <Field label="Description" hint="Goal or scope for this execution">
                <textarea
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-sky-400"
                  onChange={(event) => setField('description', event.target.value)}
                  placeholder="Smoke coverage for the release"
                  rows={3}
                  value={form.description}
                />
              </Field>
            </div>
          ) : null}

          {/* Tab: Suites */}
          {!isLoadingData && activeTab === 'suites' ? (
            <div className="space-y-5">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-zinc-950 dark:text-white">Test types</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Select one or more test strategies. Suites are added inside each selected type.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {TEST_TYPE_OPTIONS.map((option) => {
                    const isSelected = selectedTestTypes.includes(option.type);

                    return (
                      <button
                        className={`rounded-lg border p-3 text-left transition ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50 dark:border-sky-600 dark:bg-sky-950'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                        }`}
                        key={option.type}
                        onClick={() => toggleTestType(option.type)}
                        type="button"
                      >
                        <span
                          className={`block text-sm font-semibold ${
                            isSelected ? 'text-sky-800 dark:text-sky-200' : 'text-zinc-900 dark:text-white'
                          }`}
                        >
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errors.testTypes ? (
                <p className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" /> {errors.testTypes}
                </p>
              ) : null}

              {errors.suites ? (
                <p className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" /> {errors.suites}
                </p>
              ) : null}

              {selectedTestTypes.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  Select a test type to start organizing suites.
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
                      className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
                      key={type}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                            {option.label}
                          </h3>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {assignedSuites.length} suite(s), {assignedCaseCount} cases
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative min-w-52">
                            <select
                              className="h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-xs text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                              disabled={unassignedSuites.length === 0}
                              onChange={(event) => {
                                assignSuiteToType(type, event.target.value);
                                event.target.value = '';
                              }}
                              value=""
                            >
                              <option value="">
                                {unassignedSuites.length === 0 ? 'No suites available' : 'Add suite...'}
                              </option>
                              {unassignedSuites.map((suite) => (
                                <option key={suite.id} value={suite.id}>
                                  {suite.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                          </div>
                          <button
                            className="h-9 rounded-lg px-3 text-xs font-medium text-zinc-500 transition hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-950"
                            disabled={assignedSuites.length === 0}
                            onClick={() => clearTypeSuites(type)}
                            type="button"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {assignedSuites.length === 0 ? (
                        <p className="mt-3 rounded-lg border border-dashed border-zinc-300 px-3 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                          This type has no suites yet.
                        </p>
                      ) : (
                        <div className="mt-3 grid gap-2">
                          {assignedSuites.map((suite) => (
                            <div
                              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                              key={suite.id}
                            >
                              <Layers3 className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                                  {suite.name}
                                </p>
                                <p className="text-xs text-zinc-400">
                                  {suite._count?.testCases || 0} cases
                                </p>
                              </div>
                              <button
                                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                                onClick={() => removeSuiteAssignment(suite.id)}
                                title={`Remove ${suite.name}`}
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
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-950 dark:text-white">
                      {selectedTestTypes.length}
                    </span>{' '}
                    type(s) selected with{' '}
                    <span className="font-semibold text-zinc-950 dark:text-white">
                      {selectedSuiteOptions.length}
                    </span>{' '}
                    suite(s) and{' '}
                    <span className="font-semibold text-zinc-950 dark:text-white">
                      {totalCasesSelected}
                    </span>{' '}
                    cases
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">
            {selectedTestTypes.length > 0
              ? `${selectedTestTypes.length} type(s), ${selectedSuiteOptions.length} suite(s), ${totalCasesSelected} cases`
              : 'No test types selected'}
          </p>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-lg px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              disabled={submitting}
              onClick={handleSubmit}
              type="button"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-950/30 dark:border-t-zinc-950" />
                  Creating
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Create run
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

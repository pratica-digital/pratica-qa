import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
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
import type { AuthUser, ManagedTestSuite, PaginatedResponse, TestPlan, TestRun } from '../types/testRun';
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

type TestRunFormErrors = Partial<Record<keyof TestRunForm | 'suites', string>>;

type FieldProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
};

type SuiteCheckboxProps = {
  suite: SuiteOption;
  checked: boolean;
  onToggle: (id: string) => void;
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

function SuiteCheckbox({ suite, checked, onToggle }: SuiteCheckboxProps) {
  const caseCount = suite._count?.testCases || 0;

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
        checked
          ? 'border-sky-500 bg-sky-50 dark:border-sky-600 dark:bg-sky-950'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
      }`}
    >
      <input
        checked={checked}
        className="h-4 w-4 rounded border-zinc-300 accent-sky-500 dark:border-zinc-600"
        onChange={() => onToggle(suite.id)}
        type="checkbox"
      />
      <Layers3
        className={`h-4 w-4 shrink-0 ${checked ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            checked ? 'text-sky-800 dark:text-sky-200' : 'text-zinc-900 dark:text-white'
          }`}
        >
          {suite.name}
        </p>
        <p className="text-xs text-zinc-400">{caseCount} cases</p>
      </div>
    </label>
  );
}

export function NewTestRunModal({ open, onClose, onCreate, qaUsers = [], projectId }: NewTestRunModalProps) {
  const { token } = useAuth();
  const [form, setForm] = useState<TestRunForm>(initialForm);
  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);
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

  if (!open) {
    return null;
  }

  function setField<Field extends keyof TestRunForm>(field: Field, value: TestRunForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function toggleSuite(id: string) {
    setSelectedSuites((current) =>
      current.includes(id) ? current.filter((suiteId) => suiteId !== id) : [...current, id],
    );
    setErrors((current) => ({ ...current, suites: undefined }));
  }

  function selectAll() {
    setSelectedSuites(suites.map((suite) => suite.id));
  }

  function clearAll() {
    setSelectedSuites([]);
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

    if (selectedSuites.length === 0) {
      nextErrors.suites = 'Select at least one suite';
    }

    return nextErrors;
  }

  async function handleSubmit() {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setActiveTab(nextErrors.suites ? 'suites' : 'info');
      return;
    }

    if (!token) {
      setLoadError('Authentication required');
      return;
    }

    setSubmitting(true);
    setLoadError('');

    try {
      const response = await fetch('http://localhost:3000/api/test-runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: projectId || suites[0]?.projectId,
          testPlanId: form.planId,
          assignedToId: form.assignedToId,
          name: form.name.trim(),
          description: form.description.trim(),
          suiteIds: selectedSuites,
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
      setSelectedSuites([]);
      setErrors({});
      setActiveTab('info');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to create test run');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSuiteOptions = suites.filter((suite) => selectedSuites.includes(suite.id));
  const totalCasesSelected = selectedSuiteOptions.reduce(
    (sum, suite) => sum + (suite._count?.testCases || 0),
    0,
  );

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'info', label: 'Setup' },
    { id: 'suites', label: `Suites (${selectedSuites.length})` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="relative flex w-full max-w-xl flex-col rounded-t-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-lg">

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
              {tab.id === 'suites' && errors.suites ? (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                  !
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
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
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Select suites for this run.</p>
                <div className="flex gap-2">
                  <button
                    className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    disabled={suites.length === 0}
                    onClick={selectAll}
                    type="button"
                  >
                    All
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <button
                    className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    onClick={clearAll}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {errors.suites ? (
                <p className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" /> {errors.suites}
                </p>
              ) : null}

              {suites.length === 0 ? (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  No suites available
                </p>
              ) : (
                <div className="grid gap-2">
                  {suites.map((suite) => (
                    <SuiteCheckbox
                      checked={selectedSuites.includes(suite.id)}
                      key={suite.id}
                      onToggle={toggleSuite}
                      suite={suite}
                    />
                  ))}
                </div>
              )}

              {selectedSuites.length > 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-950 dark:text-white">
                      {selectedSuites.length}
                    </span>{' '}
                    suite(s) selected with{' '}
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
        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">
            {selectedSuites.length > 0 ? `${totalCasesSelected} cases will be queued` : 'No suites selected'}
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
  );
}

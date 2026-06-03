import type { MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FolderOpen,
  Layers3,
  ListChecks,
  Loader2,
  Play,
  PlaySquare,
  RefreshCw,
  Trash2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import {
  CaseStatusBadge,
  PriorityBadge,
  ProjectStatusBadge,
  SuiteStatusBadge,
  TestResultStatusBadge,
  TestRunStatusBadge,
} from '../components/badges';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { ExpandableCard } from '../components/dashboard/ExpandableCard';
import { ProjectDetailPanel } from '../components/projects/ProjectDetailPanel';
import { TestPlanDetailPanel } from '../components/test-plan/TestPlanDetailPanel';
import { TestSuiteDetailPanel } from '../components/test-suites/TestSuiteDetailPanel';
import { ApiError, projectsApi, testCasesApi, testPlansApi, testResultsApi, testRunsApi, testSuitesApi } from '../lib/api';
import type { PageId } from '../data/workspace';
import type {
  ManagedTestCase,
  ManagedTestSuite,
  ProjectSummary,
  TestPlan,
  TestResult,
  TestResultStatus,
  TestRun,
} from '../types/testRun';

type DashboardPageProps = {
  onNavigate: (page: PageId) => void;
  onOpenRun: (testRun: TestRun) => void;
};

type DashboardTotals = {
  projects: number;
  suites: number;
  cases: number;
  plans: number;
  runs: number;
  passed: number;
  failed: number;
  pending: number;
};

type DashboardData = {
  projects: ProjectSummary[];
  suites: ManagedTestSuite[];
  plans: TestPlan[];
  runs: TestRun[];
  passedResults: TestResult[];
  failedResults: TestResult[];
  pendingResults: TestResult[];
  latestProjectRuns: Record<string, TestRun | undefined>;
  totals: DashboardTotals;
};

type ProjectPreview = {
  suites: ManagedTestSuite[];
  plans: TestPlan[];
  runs: TestRun[];
};

type SuitePreview = {
  cases: ManagedTestCase[];
  runs: TestRun[];
};

type MetricKey = 'passed' | 'failed' | 'pending';

type DashboardDeleteTarget =
  | { type: 'project'; item: ProjectSummary }
  | { type: 'suite'; item: ManagedTestSuite }
  | { type: 'plan'; item: TestPlan }
  | { type: 'run'; item: TestRun };

const emptyTotals: DashboardTotals = {
  projects: 0,
  suites: 0,
  cases: 0,
  plans: 0,
  runs: 0,
  passed: 0,
  failed: 0,
  pending: 0,
};

const initialDashboardData: DashboardData = {
  projects: [],
  suites: [],
  plans: [],
  runs: [],
  passedResults: [],
  failedResults: [],
  pendingResults: [],
  latestProjectRuns: {},
  totals: emptyTotals,
};

const metricToneClasses = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  sky: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
  violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300',
  zinc: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
};

function getTotal<T>(page: { data: T[]; meta?: { total: number } }) {
  return page.meta?.total ?? page.data.length;
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'No date';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getRunStats(testRun: TestRun) {
  const results = testRun.results ?? [];
  const passed = results.filter((result) => result.status === 'PASSED').length;
  const failed = results.filter((result) => result.status === 'FAILED').length;
  const skipped = results.filter((result) => result.status === 'SKIPPED').length;
  const pending = results.filter((result) => result.status === 'PENDING').length;
  const complete = results.length - pending;

  return {
    complete,
    failed,
    passed,
    pending,
    skipped,
    total: results.length,
    percent: results.length === 0 ? 0 : Math.round((complete / results.length) * 100),
  };
}

function getResultCount(results: TestResult[], status: TestResultStatus) {
  return results.filter((result) => result.status === status).length;
}

function groupRunResults(run: TestRun) {
  const suiteNames = new Map(
    (run.suites ?? []).map((suite) => [
      suite.testSuiteId,
      suite.testSuite?.name ?? `Suite ${suite.position}`,
    ]),
  );
  const suiteOrder = new Map(
    (run.suites ?? []).map((suite) => [suite.testSuiteId, suite.position]),
  );
  const groups = new Map<string, TestResult[]>();

  (run.results ?? []).forEach((result) => {
    const suiteId = result.testCase.suiteId ?? 'without-suite';
    groups.set(suiteId, [...(groups.get(suiteId) ?? []), result]);
  });

  return [...groups.entries()]
    .map(([suiteId, results]) => ({
      suiteId,
      suiteName: suiteNames.get(suiteId) ?? 'Unassigned suite',
      order: suiteOrder.get(suiteId) ?? Number.MAX_SAFE_INTEGER,
      results,
    }))
    .sort((left, right) => left.order - right.order || left.suiteName.localeCompare(right.suiteName));
}

function getSuiteExecutionSummary(suiteId: string, runs: TestRun[]) {
  const results = runs.flatMap((run) =>
    (run.results ?? []).filter((result) => result.testCase.suiteId === suiteId),
  );

  return {
    total: results.length,
    passed: getResultCount(results, 'PASSED'),
    failed: getResultCount(results, 'FAILED'),
    pending: getResultCount(results, 'PENDING'),
  };
}

function getProjectCaseCount(projectId: string, suites: ManagedTestSuite[]) {
  return suites
    .filter((suite) => suite.projectId === projectId)
    .reduce((total, suite) => total + (suite._count?.testCases ?? 0), 0);
}

function getSuiteName(suiteId: string | undefined, suites: ManagedTestSuite[]) {
  if (!suiteId) {
    return 'Unassigned suite';
  }

  return suites.find((suite) => suite.id === suiteId)?.name ?? 'Suite';
}

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

function SectionHeader({
  actionLabel,
  children,
  onAction,
}: {
  actionLabel: string;
  children: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">{children}</h2>
      <button
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
        onClick={onAction}
        type="button"
      >
        {actionLabel}
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      {label}
    </p>
  );
}

function DetailButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
      onClick={(event) => {
        stopPropagation(event);
        onClick();
      }}
      type="button"
    >
      {children}
    </button>
  );
}

function DeleteActionButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-red text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:bg-zinc-950 dark:text-rose-300 dark:hover:bg-rose-950"
      onClick={(event) => {
        stopPropagation(event);
        onClick();
      }}
      title={title}
      type="button"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function DashboardMetricCard({
  active,
  description,
  icon: Icon,
  label,
  onClick,
  tone,
  value,
}: {
  active?: boolean;
  description: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: keyof typeof metricToneClasses;
  value: number;
}) {
  return (
    <button
      className={`group rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60 ${
        active
          ? 'border-zinc-950 ring-2 ring-zinc-200 dark:border-white dark:ring-zinc-800'
          : 'border-zinc-200 dark:border-zinc-800'
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${metricToneClasses[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-zinc-400 transition group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
      </div>
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
        {value}
      </p>
      <p className="mt-2 line-clamp-2 min-h-10 text-xs text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
    </button>
  );
}

function ResultPreviewList({
  emptyLabel,
  onOpenRun,
  openingRunId,
  results,
  suites,
}: {
  emptyLabel: string;
  onOpenRun: (result: TestResult) => void;
  openingRunId: string | null;
  results: TestResult[];
  suites: ManagedTestSuite[];
}) {
  if (results.length === 0) {
    return <EmptyBlock label={emptyLabel} />;
  }

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <button
          className="grid w-full gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 sm:grid-cols-[1fr_auto]"
          disabled={!result.testRun?.id || openingRunId === result.testRun?.id}
          key={result.id}
          onClick={() => onOpenRun(result)}
          type="button"
        >
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <TestResultStatusBadge status={result.status} />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {getSuiteName(result.testCase.suiteId, suites)}
              </span>
            </span>
            <span className="mt-2 block text-sm font-medium text-zinc-950 dark:text-white">
              {result.testCase.title}
            </span>
            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
              {result.testRun?.name ?? 'Run unavailable'}
            </span>
            {result.comment ? (
              <span className="mt-2 block line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                {result.comment}
              </span>
            ) : null}
          </span>
          <span className="inline-flex items-center justify-end gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            {openingRunId === result.testRun?.id ? 'Opening' : 'Open run'}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      ))}
    </div>
  );
}

export function DashboardPage({ onNavigate, onOpenRun }: DashboardPageProps) {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [data, setData] = useState<DashboardData>(initialDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
  const [projectPreviews, setProjectPreviews] = useState<Record<string, ProjectPreview>>({});
  const [suitePreviews, setSuitePreviews] = useState<Record<string, SuitePreview>>({});
  const [planDetails, setPlanDetails] = useState<Record<string, TestPlan>>({});
  const [loadingPreviewIds, setLoadingPreviewIds] = useState<Record<string, boolean>>({});
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<TestPlan | null>(null);
  const [selectedSuiteDetail, setSelectedSuiteDetail] = useState<{
    suite: ManagedTestSuite;
    cases: ManagedTestCase[];
  } | null>(null);
  const [openingRunId, setOpeningRunId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardDeleteTarget | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [
        projectsPage,
        suitesPage,
        casesPage,
        plansPage,
        runsPage,
        passedPage,
        failedPage,
        pendingPage,
      ] = await Promise.all([
        projectsApi.listPage(token, { limit: 8 }),
        testSuitesApi.listPage(token, { limit: 100 }),
        testCasesApi.listPage(token, { limit: 1 }),
        testPlansApi.listPage(token, { limit: 8 }),
        testRunsApi.listPage(token, { limit: 10 }),
        testResultsApi.listPage(token, { status: 'PASSED', limit: 6 }),
        testResultsApi.listPage(token, { status: 'FAILED', limit: 8 }),
        testResultsApi.listPage(token, { status: 'PENDING', limit: 6 }),
      ]);

      const latestProjectRunEntries = await Promise.all(
        projectsPage.data.slice(0, 6).map(async (project) => {
          try {
            const projectRunsPage = await testRunsApi.listPage(token, {
              projectId: project.id,
              limit: 1,
            });

            return [project.id, projectRunsPage.data[0]] as const;
          } catch {
            return [project.id, undefined] as const;
          }
        }),
      );

      setData({
        projects: projectsPage.data,
        suites: suitesPage.data,
        plans: plansPage.data,
        runs: runsPage.data,
        passedResults: passedPage.data,
        failedResults: failedPage.data,
        pendingResults: pendingPage.data,
        latestProjectRuns: Object.fromEntries(latestProjectRunEntries),
        totals: {
          projects: getTotal(projectsPage),
          suites: getTotal(suitesPage),
          cases: getTotal(casesPage),
          plans: getTotal(plansPage),
          runs: getTotal(runsPage),
          passed: getTotal(passedPage),
          failed: getTotal(failedPage),
          pending: getTotal(pendingPage),
        },
      });
    } catch (fetchError) {
      if (fetchError instanceof ApiError && fetchError.status === 401) {
        setError('Your session expired. Sign out and sign in again.');
      } else {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load dashboard.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchDashboard]);

  const recentProjects = data.projects.slice(0, 6);
  const recentSuites = data.suites.slice(0, 5);
  const recentPlans = data.plans.slice(0, 5);
  const recentRuns = data.runs.slice(0, 5);

  const caseCountByProjectId = useMemo(() => {
    return data.projects.reduce<Record<string, number>>((counts, project) => {
      counts[project.id] = getProjectCaseCount(project.id, data.suites);
      return counts;
    }, {});
  }, [data.projects, data.suites]);

  const setPreviewLoading = useCallback((key: string, isPreviewLoading: boolean) => {
    setLoadingPreviewIds((current) => ({
      ...current,
      [key]: isPreviewLoading,
    }));
  }, []);

  const loadProjectPreview = useCallback(
    async (projectId: string) => {
      if (!token || projectPreviews[projectId]) {
        return;
      }

      const loadingKey = `project:${projectId}`;
      setPreviewLoading(loadingKey, true);

      try {
        const [suitesPage, plansPage, runsPage] = await Promise.all([
          testSuitesApi.listPage(token, { projectId, limit: 6 }),
          testPlansApi.listPage(token, { projectId, limit: 6 }),
          testRunsApi.listPage(token, { projectId, limit: 6 }),
        ]);

        setProjectPreviews((current) => ({
          ...current,
          [projectId]: {
            suites: suitesPage.data,
            plans: plansPage.data,
            runs: runsPage.data,
          },
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load project preview.');
      } finally {
        setPreviewLoading(loadingKey, false);
      }
    },
    [projectPreviews, setPreviewLoading, token],
  );

  const loadSuitePreview = useCallback(
    async (suite: ManagedTestSuite) => {
      if (!token || suitePreviews[suite.id]) {
        return;
      }

      const loadingKey = `suite:${suite.id}`;
      setPreviewLoading(loadingKey, true);

      try {
        const [casesPage, runsPage] = await Promise.all([
          testCasesApi.listPage(token, { suiteId: suite.id, limit: 10 }),
          testRunsApi.listPage(token, { projectId: suite.projectId, limit: 10 }),
        ]);

        setSuitePreviews((current) => ({
          ...current,
          [suite.id]: {
            cases: casesPage.data,
            runs: runsPage.data,
          },
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load suite preview.');
      } finally {
        setPreviewLoading(loadingKey, false);
      }
    },
    [setPreviewLoading, suitePreviews, token],
  );

  const loadPlanDetail = useCallback(
    async (plan: TestPlan) => {
      if (!token || planDetails[plan.id]) {
        return;
      }

      const loadingKey = `plan:${plan.id}`;
      setPreviewLoading(loadingKey, true);

      try {
        const nextPlan = await testPlansApi.get(token, plan.id);
        setPlanDetails((current) => ({
          ...current,
          [plan.id]: nextPlan,
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load test plan.');
      } finally {
        setPreviewLoading(loadingKey, false);
      }
    },
    [planDetails, setPreviewLoading, token],
  );

  const loadRunDetail = useCallback(
    async (run: TestRun) => {
      if (!token) {
        return;
      }

      const loadingKey = `run:${run.id}`;
      setPreviewLoading(loadingKey, true);

      try {
        const nextRun = await testRunsApi.get(token, run.id);
        setData((current) => ({
          ...current,
          runs: current.runs.map((item) => (item.id === nextRun.id ? nextRun : item)),
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load test run.');
      } finally {
        setPreviewLoading(loadingKey, false);
      }
    },
    [setPreviewLoading, token],
  );

  function toggleCard(key: string) {
    setExpandedCards((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function handleProjectToggle(project: ProjectSummary) {
    const key = `project:${project.id}`;
    const willExpand = !expandedCards[key];
    toggleCard(key);

    if (willExpand) {
      void loadProjectPreview(project.id);
    }
  }

  function handleSuiteToggle(suite: ManagedTestSuite) {
    const key = `suite:${suite.id}`;
    const willExpand = !expandedCards[key];
    toggleCard(key);

    if (willExpand) {
      void loadSuitePreview(suite);
    }
  }

  function handlePlanToggle(plan: TestPlan) {
    const key = `plan:${plan.id}`;
    const willExpand = !expandedCards[key];
    toggleCard(key);

    if (willExpand) {
      void loadPlanDetail(plan);
    }
  }

  function handleRunToggle(run: TestRun) {
    const key = `run:${run.id}`;
    const willExpand = !expandedCards[key];
    toggleCard(key);

    if (willExpand) {
      void loadRunDetail(run);
    }
  }

  async function handleOpenPlan(plan: TestPlan) {
    if (!token) {
      setSelectedPlan(plan);
      return;
    }

    try {
      const freshPlan = await testPlansApi.get(token, plan.id);
      setSelectedPlan(freshPlan);
      setPlanDetails((current) => ({ ...current, [plan.id]: freshPlan }));
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Unable to open test plan.');
    }
  }

  async function handleOpenSuite(suite: ManagedTestSuite) {
    if (!token) {
      setSelectedSuiteDetail({
        suite,
        cases: suitePreviews[suite.id]?.cases ?? [],
      });
      return;
    }

    try {
      const [freshSuite, casesPage] = await Promise.all([
        testSuitesApi.get(token, suite.id),
        testCasesApi.listPage(token, { suiteId: suite.id, limit: 100 }),
      ]);

      setSelectedSuiteDetail({
        suite: freshSuite,
        cases: casesPage.data,
      });
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Unable to open test suite.');
    }
  }

  async function handleOpenRun(run: TestRun) {
    if (!token) {
      onOpenRun(run);
      return;
    }

    setOpeningRunId(run.id);

    try {
      const freshRun = await testRunsApi.get(token, run.id);
      onOpenRun(freshRun);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Unable to open test run.');
    } finally {
      setOpeningRunId(null);
    }
  }

  async function handleOpenResultRun(result: TestResult) {
    if (!token || !result.testRun?.id) {
      return;
    }

    setOpeningRunId(result.testRun.id);

    try {
      const freshRun = await testRunsApi.get(token, result.testRun.id);
      onOpenRun(freshRun);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Unable to open failed test run.');
    } finally {
      setOpeningRunId(null);
    }
  }

  function requestDashboardDelete(target: DashboardDeleteTarget) {
    setError('');
    setSuccess('');
    setDeleteTarget(target);
  }

  async function handleDeleteDashboardTarget() {
    if (!token || !deleteTarget) {
      return;
    }

    const target = deleteTarget;
    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      if (target.type === 'project') {
        await projectsApi.remove(token, target.item.id);
        setData((current) => ({
          ...current,
          projects: current.projects.filter((project) => project.id !== target.item.id),
          suites: current.suites.filter((suite) => suite.projectId !== target.item.id),
          plans: current.plans.filter((plan) => plan.projectId !== target.item.id),
          runs: current.runs.filter((run) => run.projectId !== target.item.id),
          latestProjectRuns: Object.fromEntries(
            Object.entries(current.latestProjectRuns).filter(([projectId]) => projectId !== target.item.id),
          ),
          totals: {
            ...current.totals,
            projects: Math.max(0, current.totals.projects - 1),
          },
        }));
        setProjectPreviews((current) => {
          const next = { ...current };
          delete next[target.item.id];
          return next;
        });

        if (selectedProject?.id === target.item.id) {
          setSelectedProject(null);
        }

        setSuccess('Project deleted.');
      }

      if (target.type === 'suite') {
        await testSuitesApi.remove(token, target.item.id);
        setData((current) => ({
          ...current,
          suites: current.suites.filter((suite) => suite.id !== target.item.id),
          passedResults: current.passedResults.filter(
            (result) => result.testCase.suiteId !== target.item.id,
          ),
          failedResults: current.failedResults.filter(
            (result) => result.testCase.suiteId !== target.item.id,
          ),
          pendingResults: current.pendingResults.filter(
            (result) => result.testCase.suiteId !== target.item.id,
          ),
          totals: {
            ...current.totals,
            suites: Math.max(0, current.totals.suites - 1),
          },
        }));
        setSuitePreviews((current) => {
          const next = { ...current };
          delete next[target.item.id];
          return next;
        });
        setProjectPreviews((current) =>
          Object.fromEntries(
            Object.entries(current).map(([projectId, preview]) => [
              projectId,
              {
                ...preview,
                suites: preview.suites.filter((suite) => suite.id !== target.item.id),
              },
            ]),
          ),
        );

        if (selectedSuiteDetail?.suite.id === target.item.id) {
          setSelectedSuiteDetail(null);
        }

        setSuccess('Test suite deleted.');
      }

      if (target.type === 'plan') {
        await testPlansApi.remove(token, target.item.id);
        setData((current) => ({
          ...current,
          plans: current.plans.filter((plan) => plan.id !== target.item.id),
          totals: {
            ...current.totals,
            plans: Math.max(0, current.totals.plans - 1),
          },
        }));
        setPlanDetails((current) => {
          const next = { ...current };
          delete next[target.item.id];
          return next;
        });
        setProjectPreviews((current) =>
          Object.fromEntries(
            Object.entries(current).map(([projectId, preview]) => [
              projectId,
              {
                ...preview,
                plans: preview.plans.filter((plan) => plan.id !== target.item.id),
              },
            ]),
          ),
        );

        if (selectedPlan?.id === target.item.id) {
          setSelectedPlan(null);
        }

        setSuccess('Test plan deleted.');
      }

      if (target.type === 'run') {
        await testRunsApi.remove(token, target.item.id);
        setData((current) => ({
          ...current,
          runs: current.runs.filter((run) => run.id !== target.item.id),
          passedResults: current.passedResults.filter(
            (result) => result.testRun?.id !== target.item.id,
          ),
          failedResults: current.failedResults.filter(
            (result) => result.testRun?.id !== target.item.id,
          ),
          pendingResults: current.pendingResults.filter(
            (result) => result.testRun?.id !== target.item.id,
          ),
          latestProjectRuns: Object.fromEntries(
            Object.entries(current.latestProjectRuns).map(([projectId, run]) => [
              projectId,
              run?.id === target.item.id ? undefined : run,
            ]),
          ),
          totals: {
            ...current.totals,
            runs: Math.max(0, current.totals.runs - 1),
          },
        }));
        setProjectPreviews((current) =>
          Object.fromEntries(
            Object.entries(current).map(([projectId, preview]) => [
              projectId,
              {
                ...preview,
                runs: preview.runs.filter((run) => run.id !== target.item.id),
              },
            ]),
          ),
        );
        setSuitePreviews((current) =>
          Object.fromEntries(
            Object.entries(current).map(([suiteId, preview]) => [
              suiteId,
              {
                ...preview,
                runs: preview.runs.filter((run) => run.id !== target.item.id),
              },
            ]),
          ),
        );
        setSuccess('Test run deleted.');
      }

      setDeleteTarget(null);
      void fetchDashboard();
    } catch (deleteError) {
      setDeleteTarget(null);
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete item.');
    } finally {
      setIsDeleting(false);
    }
  }

  const activeMetricResults =
    activeMetric === 'passed'
      ? data.passedResults
      : activeMetric === 'failed'
        ? data.failedResults
        : activeMetric === 'pending'
          ? data.pendingResults
          : [];

  const activeMetricTitle =
    activeMetric === 'passed'
      ? 'Latest passed executions'
      : activeMetric === 'failed'
        ? 'Latest failed executions'
        : 'Pending executions';

  const deleteModalTitle =
    deleteTarget?.type === 'project'
      ? 'Delete Project?'
      : deleteTarget?.type === 'suite'
        ? 'Delete Test Suite?'
        : deleteTarget?.type === 'plan'
          ? 'Delete Test Plan?'
          : 'Delete Test Run?';

  const deleteModalDescription =
    deleteTarget?.type === 'project'
      ? 'This will remove the project and all related suites, test cases, test plans, and test runs.'
      : deleteTarget?.type === 'suite'
        ? 'This will remove the suite and its related test cases from the dashboard.'
        : deleteTarget?.type === 'plan'
          ? 'This will remove the test plan from planning dashboards and related lists.'
          : 'This will remove the test run and its execution results from the dashboard.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">QA command center</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Operational dashboard
          </h1>
        </div>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
          disabled={isLoading}
          onClick={() => void fetchDashboard()}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          description="Open the project portfolio"
          icon={FolderOpen}
          label="Total Projects"
          onClick={() => onNavigate('projects')}
          tone="sky"
          value={data.totals.projects}
        />
        <DashboardMetricCard
          description="Review suite coverage"
          icon={Layers3}
          label="Total Test Suites"
          onClick={() => onNavigate('test-suites')}
          tone="emerald"
          value={data.totals.suites}
        />
        <DashboardMetricCard
          description="Browse the case library"
          icon={ListChecks}
          label="Total Test Cases"
          onClick={() => onNavigate('test-cases')}
          tone="amber"
          value={data.totals.cases}
        />
        <DashboardMetricCard
          description="Open planning assets"
          icon={ClipboardList}
          label="Total Test Plans"
          onClick={() => onNavigate('test-plans')}
          tone="violet"
          value={data.totals.plans}
        />
        <DashboardMetricCard
          description="Open the execution queue"
          icon={PlaySquare}
          label="Total Test Runs"
          onClick={() => onNavigate('test-runs')}
          tone="zinc"
          value={data.totals.runs}
        />
        <DashboardMetricCard
          active={activeMetric === 'passed'}
          description="Expand recent successful executions"
          icon={CheckCircle2}
          label="Passed Tests"
          onClick={() => setActiveMetric((current) => (current === 'passed' ? null : 'passed'))}
          tone="emerald"
          value={data.totals.passed}
        />
        <DashboardMetricCard
          active={activeMetric === 'failed'}
          description="Open the latest failed executions"
          icon={XCircle}
          label="Failed Tests"
          onClick={() => setActiveMetric((current) => (current === 'failed' ? null : 'failed'))}
          tone="rose"
          value={data.totals.failed}
        />
        <DashboardMetricCard
          active={activeMetric === 'pending'}
          description="Inspect work still waiting for execution"
          icon={Clock3}
          label="Pending Executions"
          onClick={() => setActiveMetric((current) => (current === 'pending' ? null : 'pending'))}
          tone="amber"
          value={data.totals.pending}
        />
      </section>

      {activeMetric ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">{activeMetricTitle}</h2>
            <button
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              onClick={() => setActiveMetric(null)}
              title="Close preview"
              type="button"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <ResultPreviewList
            emptyLabel="No executions found for this status."
            onOpenRun={(result) => void handleOpenResultRun(result)}
            openingRunId={openingRunId}
            results={activeMetricResults}
            suites={data.suites}
          />
        </section>
      ) : null}

      {isLoading ? (
        <LoadingBlock label="Loading dashboard data" />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="space-y-3">
            <SectionHeader actionLabel="View all" onAction={() => onNavigate('projects')}>
              Recent Projects
            </SectionHeader>
            {recentProjects.length === 0 ? <EmptyBlock label="No projects found." /> : null}
            {recentProjects.map((project) => {
              const key = `project:${project.id}`;
              const preview = projectPreviews[project.id];
              const latestRun = data.latestProjectRuns[project.id];

              return (
                <ExpandableCard
                  actions={
                    <>
                      <DetailButton onClick={() => setSelectedProject(project)}>Open</DetailButton>
                      {isAdmin ? (
                        <DeleteActionButton
                          onClick={() => requestDashboardDelete({ type: 'project', item: project })}
                          title="Delete project"
                        />
                      ) : null}
                    </>
                  }
                  badge={project.status ? <ProjectStatusBadge status={project.status} /> : null}
                  icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      <FolderOpen className="h-4 w-4" aria-hidden="true" />
                    </span>
                  }
                  isExpanded={Boolean(expandedCards[key])}
                  key={project.id}
                  meta={
                    <span className="grid gap-3 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-4">
                      <span>Created {formatDate(project.createdAt)}</span>
                      <span>{project._count?.suites ?? 0} suites</span>
                      <span>{caseCountByProjectId[project.id] ?? 0} cases</span>
                      <span className="truncate">
                        Latest run: {latestRun?.name ?? 'No run yet'}
                      </span>
                    </span>
                  }
                  onPrimaryClick={() => setSelectedProject(project)}
                  onToggle={() => handleProjectToggle(project)}
                  subtitle={project.description || project.key || project.id}
                  title={project.name}
                >
                  {loadingPreviewIds[key] ? (
                    <LoadingBlock label="Loading linked project data" />
                  ) : preview ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 lg:grid-cols-3">
                        <div className="space-y-2">
                          <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                            Linked suites
                          </h3>
                          {preview.suites.length === 0 ? <EmptyBlock label="No suites." /> : null}
                          {preview.suites.map((suite) => (
                            <button
                              className="w-full rounded-lg border border-zinc-200 p-3 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                              key={suite.id}
                              onClick={() => void handleOpenSuite(suite)}
                              type="button"
                            >
                              <span className="block text-sm font-medium text-zinc-950 dark:text-white">
                                {suite.name}
                              </span>
                              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                                {suite._count?.testCases ?? 0} cases
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                            Linked test plans
                          </h3>
                          {preview.plans.length === 0 ? <EmptyBlock label="No plans." /> : null}
                          {preview.plans.map((plan) => (
                            <button
                              className="w-full rounded-lg border border-zinc-200 p-3 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                              key={plan.id}
                              onClick={() => void handleOpenPlan(plan)}
                              type="button"
                            >
                              <span className="block text-sm font-medium text-zinc-950 dark:text-white">
                                {plan.name}
                              </span>
                              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                                v{plan.version} - {plan.sections?.length ?? 0} sections
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                            Latest runs
                          </h3>
                          {preview.runs.length === 0 ? <EmptyBlock label="No runs." /> : null}
                          {preview.runs.map((run) => {
                            const stats = getRunStats(run);

                            return (
                              <button
                                className="w-full rounded-lg border border-zinc-200 p-3 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                                key={run.id}
                                onClick={() => void handleOpenRun(run)}
                                type="button"
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <span className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                                    {run.name}
                                  </span>
                                  <TestRunStatusBadge status={run.status} />
                                </span>
                                <span className="mt-2 block text-xs text-zinc-500 dark:text-zinc-400">
                                  {stats.passed} passed / {stats.failed} failed
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <DetailButton onClick={() => setSelectedProject(project)}>Project detail</DetailButton>
                        <DetailButton onClick={() => onNavigate('test-suites')}>Suites</DetailButton>
                        <DetailButton onClick={() => onNavigate('test-plans')}>Plans</DetailButton>
                        <DetailButton onClick={() => onNavigate('test-runs')}>Runs</DetailButton>
                      </div>
                    </div>
                  ) : (
                    <EmptyBlock label="Expand again to load project links." />
                  )}
                </ExpandableCard>
              );
            })}
          </section>

          <section className="space-y-3">
            <SectionHeader actionLabel="View all" onAction={() => onNavigate('test-suites')}>
              Test Suites
            </SectionHeader>
            {recentSuites.length === 0 ? <EmptyBlock label="No test suites found." /> : null}
            {recentSuites.map((suite) => {
              const key = `suite:${suite.id}`;
              const preview = suitePreviews[suite.id];
              const summary = getSuiteExecutionSummary(suite.id, preview?.runs ?? data.runs);

              return (
                <ExpandableCard
                  actions={
                    <>
                      <DetailButton onClick={() => void handleOpenSuite(suite)}>Open</DetailButton>
                      {isAdmin ? (
                        <DeleteActionButton
                          onClick={() => requestDashboardDelete({ type: 'suite', item: suite })}
                          title="Delete test suite"
                        />
                      ) : null}
                    </>
                  }
                  badge={<SuiteStatusBadge status={suite.status} />}
                  icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <Layers3 className="h-4 w-4" aria-hidden="true" />
                    </span>
                  }
                  isExpanded={Boolean(expandedCards[key])}
                  key={suite.id}
                  meta={
                    <span className="grid gap-3 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-4">
                      <span>{suite.project?.name ?? 'Project'}</span>
                      <span>{suite._count?.testCases ?? 0} cases</span>
                      <span>{summary.failed} failed</span>
                      <span>Updated {formatDate(suite.updatedAt)}</span>
                    </span>
                  }
                  onPrimaryClick={() => void handleOpenSuite(suite)}
                  onToggle={() => handleSuiteToggle(suite)}
                  subtitle={suite.description || 'No description'}
                  title={suite.name}
                >
                  {loadingPreviewIds[key] ? (
                    <LoadingBlock label="Loading suite cases and execution summary" />
                  ) : preview ? (
                    <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
                      <div>
                        <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                          Test cases
                        </h3>
                        <div className="mt-3 space-y-2">
                          {preview.cases.length === 0 ? <EmptyBlock label="No cases in this suite." /> : null}
                          {preview.cases.map((testCase) => (
                            <button
                              className="grid w-full gap-3 rounded-lg border border-zinc-200 p-3 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 sm:grid-cols-[1fr_auto]"
                              key={testCase.id}
                              onClick={() => onNavigate('test-cases')}
                              type="button"
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-zinc-950 dark:text-white">
                                  {testCase.title}
                                </span>
                                <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                                  {testCase.steps?.length ?? 0} steps
                                </span>
                              </span>
                              <span className="flex flex-wrap items-center gap-2">
                                <PriorityBadge priority={testCase.priority} />
                                <CaseStatusBadge status={testCase.status} />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <aside className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                        <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                          Execution summary
                        </h3>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div>
                            <p className="font-semibold text-zinc-950 dark:text-white">{summary.passed}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Pass</p>
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-950 dark:text-white">{summary.failed}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Fail</p>
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-950 dark:text-white">{summary.pending}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Open</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                            Latest updates
                          </h4>
                          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                            Suite updated {formatDate(suite.updatedAt)}
                          </p>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            {preview.runs[0]?.name ?? 'No recent run linked'}
                          </p>
                        </div>
                      </aside>
                    </div>
                  ) : (
                    <EmptyBlock label="Expand again to load suite details." />
                  )}
                </ExpandableCard>
              );
            })}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="space-y-3">
            <SectionHeader actionLabel="View all" onAction={() => onNavigate('test-runs')}>
              Test Runs
            </SectionHeader>
            {recentRuns.length === 0 ? <EmptyBlock label="No test runs found." /> : null}
            {recentRuns.map((run) => {
              const key = `run:${run.id}`;
              const stats = getRunStats(run);

              return (
                <ExpandableCard
                  actions={
                    <>
                      <DetailButton onClick={() => void handleOpenRun(run)}>Execute</DetailButton>
                      {isAdmin ? (
                        <DeleteActionButton
                          onClick={() => requestDashboardDelete({ type: 'run', item: run })}
                          title="Delete test run"
                        />
                      ) : null}
                    </>
                  }
                  badge={<TestRunStatusBadge status={run.status} />}
                  icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                      <PlaySquare className="h-4 w-4" aria-hidden="true" />
                    </span>
                  }
                  isExpanded={Boolean(expandedCards[key])}
                  key={run.id}
                  meta={
                    <span className="space-y-2">
                      <span className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{stats.complete}/{stats.total} executed</span>
                        <span>{stats.percent}%</span>
                      </span>
                      <span className="block h-2 rounded-full bg-zinc-100 dark:bg-zinc-900">
                        <span
                          className="block h-2 rounded-full bg-emerald-500"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </span>
                      <span className="grid grid-cols-3 gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{stats.passed} pass</span>
                        <span>{stats.failed} fail</span>
                        <span>{stats.pending} open</span>
                      </span>
                    </span>
                  }
                  onPrimaryClick={() => void handleOpenRun(run)}
                  onToggle={() => handleRunToggle(run)}
                  subtitle={run.project?.name ?? run.testPlan?.name ?? 'Execution'}
                  title={run.name}
                >
                  {loadingPreviewIds[key] ? (
                    <LoadingBlock label="Loading execution details" />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <DetailButton onClick={() => void handleOpenRun(run)}>
                          {openingRunId === run.id ? 'Opening' : 'Open execution'}
                        </DetailButton>
                        <DetailButton onClick={() => onNavigate('test-runs')}>Runs page</DetailButton>
                      </div>
                      <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
                        {groupRunResults(run).length === 0 ? (
                          <EmptyBlock label="No execution results in this run." />
                        ) : null}
                        {groupRunResults(run).map((group) => (
                          <section className="space-y-2" key={group.suiteId}>
                            <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                              <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                                {group.suiteName}
                              </h3>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {group.results.length} tests
                              </span>
                            </div>
                            {group.results.map((result) => (
                              <article
                                className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                                key={result.id}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-zinc-950 dark:text-white">
                                      {result.testCase.title}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                      {formatDate(result.executedAt)}
                                    </p>
                                  </div>
                                  <TestResultStatusBadge status={result.status} />
                                </div>
                                {result.comment ? (
                                  <p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-300">
                                    {result.comment}
                                  </p>
                                ) : null}
                              </article>
                            ))}
                          </section>
                        ))}
                      </div>
                    </div>
                  )}
                </ExpandableCard>
              );
            })}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
                Recent Failed Tests
              </h2>
              <AlertTriangle className="h-4 w-4 text-rose-500" aria-hidden="true" />
            </div>
            <ResultPreviewList
              emptyLabel="No failed tests found."
              onOpenRun={(result) => void handleOpenResultRun(result)}
              openingRunId={openingRunId}
              results={data.failedResults}
              suites={data.suites}
            />
          </section>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <SectionHeader actionLabel="View all" onAction={() => onNavigate('test-plans')}>
            Test Plans
          </SectionHeader>
          {recentPlans.length === 0 ? <EmptyBlock label="No test plans found." /> : null}
          {recentPlans.map((plan) => {
            const key = `plan:${plan.id}`;
            const detail = planDetails[plan.id] ?? plan;
            const sections = detail.sections ?? [];

            return (
              <ExpandableCard
                actions={
                  <>
                    <DetailButton onClick={() => void handleOpenPlan(plan)}>Open</DetailButton>
                    {isAdmin ? (
                      <DeleteActionButton
                        onClick={() => requestDashboardDelete({ type: 'plan', item: plan })}
                        title="Delete test plan"
                      />
                    ) : null}
                  </>
                }
                icon={
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  </span>
                }
                isExpanded={Boolean(expandedCards[key])}
                key={plan.id}
                meta={
                  <span className="grid gap-3 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-3">
                    <span>v{plan.version}</span>
                    <span>{sections.length} sections</span>
                    <span>Created {formatDate(plan.createdAt)}</span>
                  </span>
                }
                onPrimaryClick={() => void handleOpenPlan(plan)}
                onToggle={() => handlePlanToggle(plan)}
                subtitle={plan.project?.name ?? plan.description ?? 'Test plan'}
                title={plan.name}
              >
                {loadingPreviewIds[key] ? (
                  <LoadingBlock label="Loading test plan sections" />
                ) : sections.length > 0 ? (
                  <div className="space-y-3">
                    {sections.map((section, index) => (
                      <article
                        className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 sm:grid-cols-[2.5rem_1fr]"
                        key={`${section.title}-${index}`}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                            {section.title}
                          </h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                            {section.content}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyBlock label="No sections defined for this plan." />
                )}
              </ExpandableCard>
            );
          })}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Execution Summary</h2>
            <Activity className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-semibold text-zinc-950 dark:text-white">
                {data.totals.passed}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Passed</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-zinc-950 dark:text-white">
                {data.totals.failed}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-zinc-950 dark:text-white">
                {data.pendingResults.filter((result) => result.testRun?.status === 'IN_PROGRESS').length}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Active</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-zinc-950 dark:text-white">
                {data.totals.pending}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Pending</p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {data.runs.slice(0, 3).map((run) => {
              const stats = getRunStats(run);

              return (
                <button
                  className="w-full rounded-lg border border-zinc-200 p-3 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  key={run.id}
                  onClick={() => void handleOpenRun(run)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                      {run.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      {stats.percent}%
                    </span>
                  </span>
                  <span className="mt-2 block h-2 rounded-full bg-zinc-100 dark:bg-zinc-900">
                    <span
                      className="block h-2 rounded-full bg-emerald-500"
                      style={{ width: `${stats.percent}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </section>

      {selectedProject ? (
        <ProjectDetailPanel
          onClose={() => setSelectedProject(null)}
          onDelete={
            isAdmin
              ? (project) => requestDashboardDelete({ type: 'project', item: project })
              : undefined
          }
          project={selectedProject}
        />
      ) : null}

      {selectedPlan ? (
        <TestPlanDetailPanel
          onClose={() => setSelectedPlan(null)}
          onDelete={
            isAdmin
              ? () => requestDashboardDelete({ type: 'plan', item: selectedPlan })
              : undefined
          }
          onEdit={() => onNavigate('test-plans')}
          testPlan={selectedPlan}
        />
      ) : null}

      {selectedSuiteDetail ? (
        <TestSuiteDetailPanel
          cases={selectedSuiteDetail.cases}
          onClose={() => setSelectedSuiteDetail(null)}
          onDelete={
            isAdmin
              ? () => requestDashboardDelete({ type: 'suite', item: selectedSuiteDetail.suite })
              : undefined
          }
          onEdit={() => onNavigate('test-suites')}
          onOpenCase={() => onNavigate('test-cases')}
          suite={selectedSuiteDetail.suite}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteConfirmationModal
          description={deleteModalDescription}
          loading={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDeleteDashboardTarget()}
          title={deleteModalTitle}
        />
      ) : null}
    </div>
  );
}

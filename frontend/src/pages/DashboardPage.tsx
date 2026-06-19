import type { MouseEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FolderOpen,
  Layers3,
  ListChecks,
  Loader2,
  Play,
  PlaySquare,
  PieChart,
  RefreshCw,
  Trash2,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { canManageTests } from '../auth/permissions';
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
import {
  ApiError,
  projectsApi,
  reportsApi,
  testCasesApi,
  testPlansApi,
  testResultsApi,
  testRunsApi,
  testSuitesApi,
} from '../lib/api';
import type { PageId } from '../data/workspace';
import type {
  DashboardAnalytics,
  DashboardMetricDelta,
  DashboardPeriod,
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

const dashboardPeriodOptions: Array<{ label: string; value: DashboardPeriod }> = [
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Last 6 months', value: '6m' },
  { label: 'Last 12 months', value: '12m' },
];

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
  emerald: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  blue: 'border-blue-200 bg-blue-100 text-blue-800',
  amber: 'border-amber-200 bg-amber-100 text-amber-800',
  red: 'border-red-200 bg-red-100 text-red-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

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
      <h2 className="text-sm font-semibold text-slate-950">{children}</h2>
      <button
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
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
    <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-5 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
      {label}
    </p>
  );
}

function DetailButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-600 bg-red-600 text-white transition hover:bg-red-700"
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
  delta,
  description,
  icon: Icon,
  inverseDelta = false,
  label,
  onClick,
  periodLabel,
  tone,
  value,
}: {
  active?: boolean;
  delta?: DashboardMetricDelta;
  icon: LucideIcon;
  inverseDelta?: boolean;
  label: string;
  onClick: () => void;
  periodLabel?: string;
  tone: keyof typeof metricToneClasses;
  value: number;
}) {
  const deltaTone =
    !delta || delta.direction === 'flat'
      ? 'text-slate-500'
      : (delta.direction === 'up' && !inverseDelta) || (delta.direction === 'down' && inverseDelta)
        ? 'text-emerald-600'
        : 'text-red-600';
  const deltaSign = delta && delta.value > 0 ? '+' : '';

  return (
    <button
      className={`group rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 ${
        active
          ? 'border-slate-950 ring-2 ring-slate-200'
          : 'border-slate-200'
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${metricToneClasses[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
      {delta ? (
        <p className={`mt-2 text-xs font-medium ${deltaTone}`}>
          {deltaSign}
          {delta.value} in {periodLabel ?? 'selected period'}
        </p>
      ) : null}
      <p className="mt-2 line-clamp-2 min-h-10 text-xs text-slate-500">
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
          className="grid w-full gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 sm:grid-cols-[1fr_auto]"
          disabled={!result.testRun?.id || openingRunId === result.testRun?.id}
          key={result.id}
          onClick={() => onOpenRun(result)}
          type="button"
        >
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <TestResultStatusBadge status={result.status} />
              <span className="text-xs font-medium text-slate-500">
                {getSuiteName(result.testCase.suiteId, suites)}
              </span>
            </span>
            <span className="mt-2 block text-sm font-medium text-slate-950">
              {result.testCase.title}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              {result.testRun?.name ?? 'Run unavailable'}
            </span>
            {result.comment ? (
              <span className="mt-2 block line-clamp-2 text-sm text-slate-600">
                {result.comment}
              </span>
            ) : null}
          </span>
          <span className="inline-flex items-center justify-end gap-2 text-sm font-medium text-slate-600">
            {openingRunId === result.testRun?.id ? 'Opening' : 'Open run'}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      ))}
    </div>
  );
}

function ChartCard({
  children,
  icon: Icon,
  subtitle,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      {children}
    </section>
  );
}

function ChartEmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={index}>
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-5 h-56 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ))}
    </section>
  );
}

function ApprovalRateChart({ data }: { data: DashboardAnalytics['monthlyQuality'] }) {
  const hasData = data.some((item) => item.executed > 0);

  if (!hasData) {
    return <ChartEmptyState label="Nenhum dado disponível para o período selecionado." />;
  }

  const width = 720;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 42, left: 42 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const points = data.map((item, index) => {
    const x = padding.left + (data.length <= 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
    const y = padding.top + ((100 - item.approvalRate) / 100) * innerHeight;

    return { ...item, x, y };
  });
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;

  return (
    <div className="overflow-hidden rounded-lg bg-slate-50">
      <svg className="h-72 w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
        <title>Taxa de aprovação dos testes por mês</title>
        {[0, 25, 50, 75, 100].map((value) => {
          const y = padding.top + ((100 - value) / 100) * innerHeight;

          return (
            <g key={value}>
              <line stroke="#e2e8f0" strokeDasharray="4 4" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text fill="#64748b" fontSize="11" x={8} y={y + 4}>
                {value}%
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="#dbeafe" opacity="0.9" />
        <path d={linePath} fill="none" stroke="#1d4ed8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {points.map((point, index) => (
          <g key={point.month}>
            <circle cx={point.x} cy={point.y} fill="#ffffff" r="5" stroke="#1d4ed8" strokeWidth="3">
              <title>
                {point.label}: {point.approvalRate}% ({point.passed}/{point.executed})
              </title>
            </circle>
            {index % Math.ceil(points.length / 6) === 0 || index === points.length - 1 ? (
              <text fill="#64748b" fontSize="11" textAnchor="middle" x={point.x} y={height - 16}>
                {point.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function MonthlyExecutionsChart({ data }: { data: DashboardAnalytics['monthlyExecutions'] }) {
  const max = Math.max(...data.map((item) => item.executions), 0);

  if (max === 0) {
    return <ChartEmptyState label="Nenhum dado disponível para o período selecionado." />;
  }

  return (
    <div className="flex min-h-72 items-end gap-2 rounded-lg bg-slate-50 px-3 py-4">
      {data.map((item) => {
        const height = Math.max(12, Math.round((item.executions / max) * 190));

        return (
          <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2" key={item.month}>
            <div className="text-xs font-medium text-slate-600">{item.executions}</div>
            <div
              className="w-full max-w-10 rounded-t-lg bg-blue-700 transition hover:bg-blue-800"
              style={{ height }}
              title={`${item.label}: ${item.executions} executions`}
            />
            <div className="w-full truncate text-center text-[11px] text-slate-500">{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function ResultDistributionChart({ data }: { data: DashboardAnalytics['resultDistribution'] }) {
  const segments = [
    { color: '#059669', label: 'Passou', value: data.passed },
    { color: '#dc2626', label: 'Falhou', value: data.failed },
    { color: '#d97706', label: 'Bloqueado', value: data.blocked },
    { color: '#475569', label: 'Não executado', value: data.notExecuted },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;

  if (total === 0) {
    return <ChartEmptyState label="Nenhum dado disponível para o período selecionado." />;
  }

  const gradient = segments
    .map((segment) => {
      const start = cursor;
      const end = cursor + (segment.value / total) * 100;
      cursor = end;

      return `${segment.color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="grid min-h-72 gap-5 rounded-lg bg-slate-50 p-4 sm:grid-cols-[12rem_1fr] sm:items-center">
      <div className="relative mx-auto h-44 w-44 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-10 flex flex-col items-center justify-center rounded-full bg-white text-center">
          <span className="text-2xl font-semibold text-slate-950">{total}</span>
          <span className="text-xs text-slate-500">resultados</span>
        </div>
      </div>
      <div className="grid gap-2">
        {segments.map((segment) => (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" key={segment.label}>
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="font-semibold text-slate-950">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopProjectsChart({ data }: { data: DashboardAnalytics['topProjects'] }) {
  const max = Math.max(...data.map((item) => item.executions), 0);

  if (data.length === 0 || max === 0) {
    return <ChartEmptyState label="Nenhum dado disponível para o período selecionado." />;
  }

  return (
    <div className="space-y-3 rounded-lg bg-slate-50 p-4">
      {data.map((project, index) => (
        <div className="grid gap-2" key={project.projectId}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-700">
              {index + 1}. {project.name}
            </span>
            <span className="text-slate-500">{project.executions}</span>
          </div>
          <div className="h-3 rounded-full bg-white">
            <div
              className="h-3 rounded-full bg-emerald-600"
              style={{ width: `${Math.max(8, (project.executions / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentActivityPanel({ data }: { data: DashboardAnalytics['recentActivity'] }) {
  const items = [
    { label: 'Execuções realizadas', value: data.executions, tone: 'bg-blue-100 text-blue-800' },
    { label: 'Casos executados', value: data.casesExecuted, tone: 'bg-slate-100 text-slate-700' },
    { label: 'Falhas encontradas', value: data.failures, tone: 'bg-red-100 text-red-800' },
    { label: 'Aprovações', value: data.approvals, tone: 'bg-emerald-100 text-emerald-800' },
  ];

  return (
    <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
      {items.map((item) => (
        <div className="rounded-lg border border-slate-200 bg-white p-3" key={item.label}>
          <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${item.tone}`}>
            {item.label}
          </span>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage({ onNavigate, onOpenRun }: DashboardPageProps) {
  const { token, user } = useAuth();
  const canManageTestAssets = canManageTests(user);
  const [data, setData] = useState<DashboardData>(initialDashboardData);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('12m');
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
        plansPage,
        runsPage,
        passedPage,
        failedPage,
        pendingPage,
        analyticsData,
      ] = await Promise.all([
        projectsApi.listPage(token, { limit: 8 }),
        testSuitesApi.listPage(token, { limit: 100 }),
        testPlansApi.listPage(token, { limit: 8 }),
        testRunsApi.listPage(token, { limit: 10 }),
        testResultsApi.listPage(token, { status: 'PASSED', limit: 6 }),
        testResultsApi.listPage(token, { status: 'FAILED', limit: 8 }),
        testResultsApi.listPage(token, { status: 'PENDING', limit: 6 }),
        reportsApi.dashboardAnalytics(token, selectedPeriod),
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

      setAnalytics(analyticsData);
      setData({
        projects: projectsPage.data,
        suites: suitesPage.data,
        plans: plansPage.data,
        runs: runsPage.data,
        passedResults: passedPage.data,
        failedResults: failedPage.data,
        pendingResults: pendingPage.data,
        latestProjectRuns: Object.fromEntries(latestProjectRunEntries),
        totals: analyticsData.totals,
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
  }, [selectedPeriod, token]);

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
          <p className="text-sm font-medium text-slate-500">QA command center</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Operational dashboard
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600">
            Period
            <select
              className="border-0 bg-transparent p-0 text-sm font-medium text-slate-950 outline-none"
              onChange={(event) => setSelectedPeriod(event.target.value as DashboardPeriod)}
              value={selectedPeriod}
            >
              {dashboardPeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => void fetchDashboard()}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        
        <DashboardMetricCard
          delta={analytics?.metricDeltas.suites}
          icon={Layers3}
          label="Total Test Suites"
          onClick={() => onNavigate('test-suites')}
          periodLabel={analytics?.periodLabel}
          tone="emerald"
          value={data.totals.suites}
        />
        <DashboardMetricCard
          delta={analytics?.metricDeltas.cases}
          icon={ListChecks}
          label="Total Test Cases"
          onClick={() => onNavigate('test-cases')}
          periodLabel={analytics?.periodLabel}
          tone="amber"
          value={data.totals.cases}
        />
        <DashboardMetricCard
          delta={analytics?.metricDeltas.plans}
          icon={ClipboardList}
          label="Total Test Plans"
          onClick={() => onNavigate('test-plans')}
          periodLabel={analytics?.periodLabel}
          tone="violet"
          value={data.totals.plans}
        />
        <DashboardMetricCard
          delta={analytics?.metricDeltas.runs}
          
          icon={PlaySquare}
          label="Total Test Runs"
          onClick={() => onNavigate('test-runs')}
          periodLabel={analytics?.periodLabel}
          tone="slate"
          value={data.totals.runs}
        />
        
      </section>

      {activeMetric ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-950">{activeMetricTitle}</h2>
            <button
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
        <AnalyticsSkeleton />
      ) : analytics ? (
        <section className="space-y-6">
          <ChartCard
            icon={TrendingUp}
            subtitle={`${analytics.periodLabel} - qualidade geral das execuções`}
            title="Taxa de Aprovação dos Testes"
          >
            <ApprovalRateChart data={analytics.monthlyQuality} />
          </ChartCard>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              icon={BarChart3}
              subtitle={`${analytics.periodLabel} - volume de test runs`}
              title="Execuções por Mês"
            >
              <MonthlyExecutionsChart data={analytics.monthlyExecutions} />
            </ChartCard>

            <ChartCard
              icon={PieChart}
              subtitle={`${analytics.periodLabel} - saúde geral dos resultados`}
              title="Distribuição dos Resultados"
            >
              <ResultDistributionChart data={analytics.resultDistribution} />
            </ChartCard>

            <ChartCard
              icon={FolderOpen}
              subtitle={`${analytics.periodLabel} - top 5 por execuções`}
              title="Projetos Mais Ativos"
            >
              <TopProjectsChart data={analytics.topProjects} />
            </ChartCard>

            <ChartCard
              icon={Activity}
              subtitle="Execuções, casos e resultados recentes"
              title="Atividade dos Últimos 30 Dias"
            >
              <RecentActivityPanel data={analytics.recentActivity} />
            </ChartCard>
          </section>
        </section>
      ) : (
        <ChartEmptyState label="Nenhum dado disponível para o período selecionado." />
      )}

      {isLoading ? (
        <LoadingBlock label="Loading dashboard data" />
      ) : null}


      <section className="grid gap-6 lg:grid-cols-1">

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-950">Execution Summary</h2>
            <Activity className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {data.totals.passed}
              </p>
              <p className="mt-1 text-xs text-slate-500">Passed</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {data.totals.failed}
              </p>
              <p className="mt-1 text-xs text-slate-500">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {data.pendingResults.filter((result) => result.testRun?.status === 'IN_PROGRESS').length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Active</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {data.totals.pending}
              </p>
              <p className="mt-1 text-xs text-slate-500">Pending</p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {data.runs.slice(0, 3).map((run) => {
              const stats = getRunStats(run);

              return (
                <button
                  className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
                  key={run.id}
                  onClick={() => void handleOpenRun(run)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-950">
                      {run.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      {stats.percent}%
                    </span>
                  </span>
                  <span className="mt-2 block h-2 rounded-full bg-slate-100">
                    <span
                      className="block h-2 rounded-full bg-emerald-600"
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
            canManageTestAssets
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
            canManageTestAssets
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
            canManageTestAssets
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

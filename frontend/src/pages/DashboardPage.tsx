import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  FolderOpen,
  Layers3,
  ListChecks,
  Loader2,
  Play,
  PlaySquare,
  PieChart,
  RefreshCw,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { canManageTests } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { TestResultStatusBadge } from '../components/badges';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { ProjectDetailPanel } from '../components/projects/ProjectDetailPanel';
import { TestPlanDetailPanel } from '../components/test-plan/TestPlanDetailPanel';
import { TestSuiteDetailPanel } from '../components/test-suites/TestSuiteDetailPanel';
import {
  ApiError,
  projectsApi,
  reportsApi,
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

type MetricKey = 'passed' | 'failed' | 'pending';

const dashboardPeriodOptions: Array<{ label: string; value: DashboardPeriod }> = [
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Últimos 90 dias', value: '90d' },
  { label: 'Últimos 6 meses', value: '6m' },
  { label: 'Últimos 12 meses', value: '12m' },
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

function getSuiteName(suiteId: string | undefined, suites: ManagedTestSuite[]) {
  if (!suiteId) {
    return 'Suíte não atribuída';
  }

  return suites.find((suite) => suite.id === suiteId)?.name ?? 'Suíte';
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
  delta?: DashboardMetricDelta;
  description?: string;
  icon: LucideIcon;
  inverseDelta?: boolean;
  label: string;
  onClick: () => void;
  periodLabel?: string;
  tone: keyof typeof metricToneClasses;
  value: number;
}) {
  return (
    <button
      className={`group rounded-lg border bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 ${
        active
          ? 'border-slate-950 ring-2 ring-slate-200'
          : 'border-slate-200'
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-9 items-center justify-center rounded-lg border ${metricToneClasses[tone]}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>

          <p className="text-sm text-slate-500">{label}</p>
        </div>

        <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />
      </div>

      <p className="mt-1 text-center text-2xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>

      {description ? <p className="mt-2 text-xs text-slate-500">{description}</p> : null}

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
              {result.testRun?.name ?? 'Execução indisponível'}
            </span>
            {result.comment ? (
              <span className="mt-2 block line-clamp-2 text-sm text-slate-600">
                {result.comment}
              </span>
            ) : null}
          </span>
          <span className="inline-flex items-center justify-end gap-2 text-sm font-medium text-slate-600">
            {openingRunId === result.testRun?.id ? 'Abrindo' : 'Abrir execução'}
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

type ChartTooltipRow = {
  label: string;
  value: ReactNode;
};

function ChartHoverTooltip({
  className = '',
  note,
  rows,
  title,
}: {
  className?: string;
  note?: string;
  rows: ChartTooltipRow[];
  title: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute z-30 min-w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 opacity-0 shadow-lg ring-1 ring-slate-900/5 transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100 ${className}`}
    >
      <p className="font-semibold text-slate-950">{title}</p>
      <dl className="mt-2 space-y-1">
        {rows.map((row) => (
          <div className="flex items-center justify-between gap-4" key={row.label}>
            <dt className="text-slate-500">{row.label}</dt>
            <dd className="font-semibold text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
      {note ? <p className="mt-2 border-t border-slate-100 pt-2 text-slate-500">{note}</p> : null}
    </div>
  );
}

function formatChartPercent(value: number) {
  return `${Math.round(value)}%`;
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
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
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
  const activePoint = points.find((point) => point.month === activeMonth);
  const tooltipWidth = 190;
  const tooltipHeight = 68;
  const tooltipX = activePoint
    ? Math.min(Math.max(activePoint.x - tooltipWidth / 2, padding.left), width - padding.right - tooltipWidth)
    : 0;
  const tooltipY = activePoint
    ? activePoint.y > 92
      ? activePoint.y - tooltipHeight - 18
      : activePoint.y + 18
    : 0;

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
          <g
            aria-label={`${point.label}: ${point.approvalRate}% de aprovacao, ${point.passed} aprovados de ${point.executed} executados`}
            className="cursor-pointer outline-none"
            key={point.month}
            onBlur={() => setActiveMonth(null)}
            onFocus={() => setActiveMonth(point.month)}
            onMouseEnter={() => setActiveMonth(point.month)}
            onMouseLeave={() => setActiveMonth(null)}
            role="button"
            tabIndex={0}
          >
            <line
              opacity={activeMonth === point.month ? 1 : 0}
              stroke="#93c5fd"
              strokeDasharray="3 5"
              strokeWidth="2"
              x1={point.x}
              x2={point.x}
              y1={padding.top}
              y2={padding.top + innerHeight}
            />
            <circle cx={point.x} cy={point.y} fill="transparent" r="16" />
            <circle
              cx={point.x}
              cy={point.y}
              fill={activeMonth === point.month ? '#1d4ed8' : '#ffffff'}
              r={activeMonth === point.month ? 7 : 5}
              stroke="#1d4ed8"
              strokeWidth="3"
            />
            {index % Math.ceil(points.length / 6) === 0 || index === points.length - 1 ? (
              <text fill="#64748b" fontSize="11" textAnchor="middle" x={point.x} y={height - 16}>
                {point.label}
              </text>
            ) : null}
          </g>
        ))}
        {activePoint ? (
          <g pointerEvents="none">
            <rect
              fill="#ffffff"
              height={tooltipHeight}
              rx="8"
              stroke="#e2e8f0"
              width={tooltipWidth}
              x={tooltipX}
              y={tooltipY}
            />
            <text fill="#0f172a" fontSize="12" fontWeight="700" x={tooltipX + 12} y={tooltipY + 20}>
              {activePoint.label}
            </text>
            <text fill="#475569" fontSize="11" x={tooltipX + 12} y={tooltipY + 40}>
              Taxa: {formatChartPercent(activePoint.approvalRate)}
            </text>
            <text fill="#475569" fontSize="11" x={tooltipX + 12} y={tooltipY + 56}>
              Aprovados: {activePoint.passed} de {activePoint.executed}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function MonthlyExecutionsChart({ data }: { data: DashboardAnalytics['monthlyExecutions'] }) {
  const max = Math.max(...data.map((item) => item.executions), 0);
  const total = data.reduce((sum, item) => sum + item.executions, 0);

  if (max === 0) {
    return <ChartEmptyState label="Nenhum dado disponível para o período selecionado." />;
  }

  return (
    <div className="flex min-h-72 items-end gap-2 rounded-lg bg-slate-50 px-3 py-4" role="list">
      {data.map((item) => {
        const height = item.executions === 0 ? 8 : Math.max(14, Math.round((item.executions / max) * 190));
        const share = total === 0 ? 0 : (item.executions / total) * 100;

        return (
          <div
            aria-label={`${item.label}: ${item.executions} execucoes, ${formatChartPercent(share)} do periodo`}
            className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-lg px-1 py-2 outline-none transition hover:bg-white/80 focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            key={item.month}
            role="listitem"
            tabIndex={0}
          >
            <div className="text-xs font-medium text-slate-600">{item.executions}</div>
            <div
              className="w-full max-w-10 rounded-t-lg bg-blue-600 shadow-sm transition group-hover:bg-blue-700 group-focus:bg-blue-700"
              style={{ height }}
            />
            <div className="w-full truncate text-center text-[11px] text-slate-500">{item.label}</div>
            <ChartHoverTooltip
              className="bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1"
              rows={[
                { label: 'Execucoes', value: item.executions },
                { label: 'Participacao', value: formatChartPercent(share) },
              ]}
              title={item.label}
            />
          </div>
        );
      })}
    </div>
  );
}

function ResultDistributionChart({ data }: { data: DashboardAnalytics['resultDistribution'] }) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const segments = [
    { color: '#059669', label: 'Passou', tone: 'bg-emerald-100 text-emerald-800', value: data.passed },
    { color: '#dc2626', label: 'Falhou', tone: 'bg-red-100 text-red-800', value: data.failed },
    { color: '#d97706', label: 'Bloqueado', tone: 'bg-amber-100 text-amber-800', value: data.blocked },
    { color: '#475569', label: 'Não executado', tone: 'bg-slate-100 text-slate-700', value: data.notExecuted },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  let strokeOffset = 0;
  const visibleSegments = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const dash = (segment.value / total) * circumference;
      const nextSegment = {
        ...segment,
        dash,
        offset: strokeOffset,
        percent: (segment.value / total) * 100,
      };

      strokeOffset += dash;
      return nextSegment;
    });
  const activeSegment = segments.find((segment) => segment.label === activeLabel) ?? null;

  if (total === 0) {
    return <ChartEmptyState label="Nenhum dado disponível para o período selecionado." />;
  }

  return (
    <div className="grid min-h-72 gap-5 rounded-lg bg-slate-50 p-4 sm:grid-cols-[12rem_1fr] sm:items-center">
      <div className="relative mx-auto h-48 w-48">
        <svg className="h-full w-full" role="img" viewBox="0 0 200 200">
          <title>Distribuicao dos resultados no periodo</title>
          <circle cx="100" cy="100" fill="none" r={radius} stroke="#e2e8f0" strokeWidth="24" />
          {visibleSegments.map((segment) => {
            const isActive = activeLabel === segment.label;

            return (
              <circle
                aria-label={`${segment.label}: ${segment.value} resultados, ${formatChartPercent(segment.percent)}`}
                className="cursor-pointer outline-none transition"
                cx="100"
                cy="100"
                fill="none"
                key={segment.label}
                onBlur={() => setActiveLabel(null)}
                onFocus={() => setActiveLabel(segment.label)}
                onMouseEnter={() => setActiveLabel(segment.label)}
                onMouseLeave={() => setActiveLabel(null)}
                opacity={activeLabel && !isActive ? 0.45 : 1}
                r={radius}
                role="button"
                stroke={segment.color}
                strokeDasharray={`${Math.max(segment.dash - 3, 1)} ${circumference}`}
                strokeDashoffset={-segment.offset}
                strokeLinecap="round"
                strokeWidth={isActive ? 30 : 24}
                tabIndex={0}
                transform="rotate(-90 100 100)"
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-full text-center">
          <span className="text-2xl font-semibold text-slate-950">{activeSegment?.value ?? total}</span>
          <span className="text-xs text-slate-500">{activeSegment?.label ?? 'resultados'}</span>
          {activeSegment ? (
            <span className="mt-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-600 shadow-sm">
              {formatChartPercent((activeSegment.value / total) * 100)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2" role="list">
        {segments.map((segment) => {
          const percent = total === 0 ? 0 : (segment.value / total) * 100;
          const isActive = activeLabel === segment.label;

          return (
          <div
            aria-label={`${segment.label}: ${segment.value} resultados, ${formatChartPercent(percent)}`}
            className={`group relative flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm outline-none transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              isActive ? 'border-blue-300 shadow-sm' : 'border-slate-200'
            }`}
            key={segment.label}
            onBlur={() => setActiveLabel(null)}
            onFocus={() => setActiveLabel(segment.label)}
            onMouseEnter={() => setActiveLabel(segment.label)}
            onMouseLeave={() => setActiveLabel(null)}
            role="listitem"
            tabIndex={0}
          >
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className={`rounded-md px-2 py-1 font-semibold ${segment.tone}`}>{segment.value}</span>
            <ChartHoverTooltip
              className="bottom-full right-0 mb-2 translate-y-1"
              rows={[
                { label: 'Resultados', value: segment.value },
                { label: 'Participacao', value: formatChartPercent(percent) },
              ]}
              title={segment.label}
            />
          </div>
          );
        })}
      </div>
    </div>
  );
}

function TopProjectsChart({ data }: { data: DashboardAnalytics['topProjects'] }) {
  const max = Math.max(...data.map((item) => item.executions), 0);
  const total = data.reduce((sum, item) => sum + item.executions, 0);

  if (data.length === 0 || max === 0) {
    return <ChartEmptyState label="Nenhum dado disponível para o período selecionado." />;
  }

  return (
    <div className="space-y-3 rounded-lg bg-slate-50 p-4" role="list">
      {data.map((project, index) => {
        const percentOfMax = (project.executions / max) * 100;
        const share = total === 0 ? 0 : (project.executions / total) * 100;

        return (
        <div
          aria-label={`${project.name}: ${project.executions} execucoes, posicao ${index + 1}, ${formatChartPercent(share)} do ranking`}
          className="group relative grid gap-2 rounded-lg border border-transparent px-2 py-2 outline-none transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-sm focus:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          key={project.projectId}
          role="listitem"
          tabIndex={0}
        >
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-700">
              {index + 1}. {project.name}
            </span>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-emerald-50 group-hover:text-emerald-800">
              {project.executions}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            <div
              className="h-3 rounded-full bg-emerald-600 transition group-hover:bg-emerald-700 group-focus:bg-emerald-700"
              style={{ width: `${Math.max(8, percentOfMax)}%` }}
            />
          </div>
          <ChartHoverTooltip
            className="bottom-full right-2 mb-2 translate-y-1"
            rows={[
              { label: 'Execucoes', value: project.executions },
              { label: 'Participacao', value: formatChartPercent(share) },
              { label: 'Posicao', value: `#${index + 1}` },
            ]}
            title={project.name}
          />
        </div>
        );
      })}
    </div>
  );
}

function RecentActivityPanel({ data }: { data: DashboardAnalytics['recentActivity'] }) {
  const items = [
    {
      accent: 'bg-blue-600',
      label: 'Execucoes realizadas',
      note: 'Execuções com atividade nos últimos 30 dias.',
      tone: 'bg-blue-100 text-blue-800',
      value: data.executions,
    },
    {
      accent: 'bg-slate-600',
      label: 'Casos executados',
      note: 'Resultados de casos registrados no recorte recente.',
      tone: 'bg-slate-100 text-slate-700',
      value: data.casesExecuted,
    },
    {
      accent: 'bg-red-600',
      label: 'Falhas encontradas',
      note: 'Resultados marcados como falha nos últimos 30 dias.',
      tone: 'bg-red-100 text-red-800',
      value: data.failures,
    },
    {
      accent: 'bg-emerald-600',
      label: 'Aprovacoes',
      note: 'Resultados aprovados no periodo recente.',
      tone: 'bg-emerald-100 text-emerald-800',
      value: data.approvals,
    },
  ];
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2" role="list">
      {items.map((item) => {
        const width = item.value === 0 ? 4 : Math.max(12, (item.value / max) * 100);

        return (
        <div
          aria-label={`${item.label}: ${item.value}`}
          className="group relative rounded-lg border border-slate-200 bg-white p-3 outline-none transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          key={item.label}
          role="listitem"
          tabIndex={0}
        >
          <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${item.tone}`}>
            {item.label}
          </span>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${item.accent}`} style={{ width: `${width}%` }} />
          </div>
          <ChartHoverTooltip
            className="bottom-full left-3 mb-2 translate-y-1"
            note={item.note}
            rows={[{ label: 'Total', value: item.value }]}
            title={item.label}
          />
        </div>
        );
      })}
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
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
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
        setError('Sua sessão expirou. Saia e entre novamente.');
      } else {
        setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível carregar o painel.');
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
      setError(openError instanceof Error ? openError.message : 'Não foi possível abrir a execução.');
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
      setError(openError instanceof Error ? openError.message : 'Não foi possível abrir a execução com falha.');
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
        if (selectedProject?.id === target.item.id) {
          setSelectedProject(null);
        }

        setSuccess('Projeto excluído.');
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
        if (selectedSuiteDetail?.suite.id === target.item.id) {
          setSelectedSuiteDetail(null);
        }

        setSuccess('Suíte de teste excluída.');
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
        if (selectedPlan?.id === target.item.id) {
          setSelectedPlan(null);
        }

        setSuccess('Plano de teste excluído.');
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
        setSuccess('Execução excluída.');
      }

      setDeleteTarget(null);
      void fetchDashboard();
    } catch (deleteError) {
      setDeleteTarget(null);
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o item.');
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
      ? 'Últimas execuções aprovadas'
      : activeMetric === 'failed'
        ? 'Latest failed executions'
        : 'Execuções pendentes';

  const deleteModalTitle =
    deleteTarget?.type === 'project'
      ? 'Excluir projeto?'
      : deleteTarget?.type === 'suite'
        ? 'Excluir suíte de teste?'
        : deleteTarget?.type === 'plan'
          ? 'Excluir plano de teste?'
          : 'Excluir execução?';

  const deleteModalDescription =
    deleteTarget?.type === 'project'
      ? 'Isto removerá o projeto e todas as suítes, casos de teste, planos e execuções relacionados.'
      : deleteTarget?.type === 'suite'
        ? 'Isto removerá a suíte e os casos de teste relacionados do painel.'
        : deleteTarget?.type === 'plan'
          ? 'Isto removerá o plano de teste dos painéis de planejamento e listas relacionadas.'
          : 'Isto removerá a execução e seus resultados do painel.';

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
          label="Total de Suítes"
          onClick={() => onNavigate('test-suites')}
          periodLabel={analytics?.periodLabel}
          tone="emerald"
          value={data.totals.suites}
        />
        <DashboardMetricCard
          delta={analytics?.metricDeltas.cases}
          icon={ListChecks}
          label="Total de Casos"
          onClick={() => onNavigate('test-cases')}
          periodLabel={analytics?.periodLabel}
          tone="amber"
          value={data.totals.cases}
        />
        <DashboardMetricCard
          delta={analytics?.metricDeltas.plans}
          icon={ClipboardList}
          label="Total de Planos"
          onClick={() => onNavigate('test-plans')}
          periodLabel={analytics?.periodLabel}
          tone="violet"
          value={data.totals.plans}
        />
        <DashboardMetricCard
          delta={analytics?.metricDeltas.runs}
          
          icon={PlaySquare}
          label="Total de Execuções"
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
              title="Fechar prévia"
              type="button"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <ResultPreviewList
            emptyLabel="Nenhuma execução encontrada para este status."
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
              subtitle={`${analytics.periodLabel} - volume de execuções`}
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
        <LoadingBlock label="Carregando dados do painel" />
      ) : null}


      <section className="grid gap-6 lg:grid-cols-1">

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-950">Resumo das Execuções</h2>
            <Activity className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {data.totals.passed}
              </p>
              <p className="mt-1 text-xs text-slate-500">Aprovados</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {data.totals.failed}
              </p>
              <p className="mt-1 text-xs text-slate-500">Falhas</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {data.pendingResults.filter((result) => result.testRun?.status === 'IN_PROGRESS').length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Ativos</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {data.totals.pending}
              </p>
              <p className="mt-1 text-xs text-slate-500">Pendentes</p>
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

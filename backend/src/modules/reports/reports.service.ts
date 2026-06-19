import { Injectable } from '@nestjs/common';
import { TestResultStatus } from '@prisma/client';
import { DashboardPeriod } from './dto/query-dashboard-analytics.dto';
import { ReportsRepository } from './repositories/reports.repository';

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
};

type PeriodWindow = {
  start: Date;
  previousStart: Date;
  previousEnd: Date;
  chartStart: Date;
  end: Date;
};

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function getPeriodWindow(period: DashboardPeriod): PeriodWindow {
  const end = new Date();
  const start = new Date(end);

  if (period === '30d') {
    start.setDate(start.getDate() - 29);
  } else if (period === '90d') {
    start.setDate(start.getDate() - 89);
  } else {
    const months = period === '6m' ? 5 : 11;
    start.setMonth(start.getMonth() - months, 1);
    start.setHours(0, 0, 0, 0);
  }

  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    start,
    previousStart,
    previousEnd,
    chartStart: startOfMonth(start),
    end,
  };
}

function buildMonthBuckets(start: Date, end: Date) {
  const buckets: Array<{ month: string; label: string }> = [];
  const formatter = new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit' });
  let cursor = startOfMonth(start);
  const last = startOfMonth(end);

  while (cursor <= last) {
    buckets.push({
      month: cursor.toISOString().slice(0, 7),
      label: formatter.format(cursor),
    });
    cursor = addMonths(cursor, 1);
  }

  return buckets;
}

function toMonthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

function calculateDelta(current: number, previous: number) {
  if (previous === 0) {
    return {
      value: current,
      percent: current > 0 ? 100 : 0,
      direction: current > 0 ? 'up' : 'flat',
    };
  }

  const percent = Math.round(((current - previous) / previous) * 100);

  return {
    value: current - previous,
    percent,
    direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat',
  };
}

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getDashboardAnalytics(period: DashboardPeriod) {
    const window = getPeriodWindow(period);
    const recentStart = addDays(window.end, -29);

    const [
      totals,
      currentCreatedSummary,
      previousCreatedSummary,
      currentResultSummary,
      previousResultSummary,
      monthlyQualityRows,
      monthlyExecutionRows,
      distributionRows,
      topProjects,
      recentExecutions,
      recentResultActivity,
    ] = await Promise.all([
      this.reportsRepository.getGlobalTotals(),
      this.reportsRepository.getCreatedEntitySummary(window.start, window.end),
      this.reportsRepository.getCreatedEntitySummary(window.previousStart, window.previousEnd),
      this.reportsRepository.getResultSummary(window.start, window.end),
      this.reportsRepository.getResultSummary(window.previousStart, window.previousEnd),
      this.reportsRepository.getMonthlyQuality(window.chartStart, window.end),
      this.reportsRepository.getMonthlyExecutions(window.chartStart, window.end),
      this.reportsRepository.getResultDistribution(window.start, window.end),
      this.reportsRepository.getTopProjects(window.start, window.end),
      this.reportsRepository.getRecentExecutionCount(recentStart, window.end),
      this.reportsRepository.getRecentResultActivity(recentStart, window.end),
    ]);

    const monthlyQualityByKey = new Map(monthlyQualityRows.map((row) => [toMonthKey(row.month), row]));
    const monthlyExecutionsByKey = new Map(monthlyExecutionRows.map((row) => [toMonthKey(row.month), row]));
    const months = buildMonthBuckets(window.chartStart, window.end);
    const distribution = {
      passed: 0,
      failed: 0,
      blocked: 0,
      notExecuted: 0,
    };

    distributionRows.forEach((row) => {
      if (row.status === TestResultStatus.PASSED) {
        distribution.passed = row.total;
      } else if (row.status === TestResultStatus.FAILED) {
        distribution.failed = row.total;
      } else if (row.status === TestResultStatus.SKIPPED) {
        distribution.blocked = row.total;
      } else if (row.status === TestResultStatus.PENDING) {
        distribution.notExecuted = row.total;
      }
    });

    return {
      period,
      periodLabel: PERIOD_LABELS[period],
      generatedAt: window.end.toISOString(),
      range: {
        start: window.start.toISOString(),
        end: window.end.toISOString(),
      },
      totals,
      metricDeltas: {
        projects: calculateDelta(currentCreatedSummary.projects, previousCreatedSummary.projects),
        suites: calculateDelta(currentCreatedSummary.suites, previousCreatedSummary.suites),
        cases: calculateDelta(currentCreatedSummary.cases, previousCreatedSummary.cases),
        plans: calculateDelta(currentCreatedSummary.plans, previousCreatedSummary.plans),
        runs: calculateDelta(currentCreatedSummary.runs, previousCreatedSummary.runs),
        passed: calculateDelta(currentResultSummary.passed, previousResultSummary.passed),
        failed: calculateDelta(currentResultSummary.failed, previousResultSummary.failed),
        pending: calculateDelta(currentResultSummary.pending, previousResultSummary.pending),
      },
      monthlyQuality: months.map((bucket) => {
        const row = monthlyQualityByKey.get(bucket.month);
        const passed = row?.passed ?? 0;
        const executed = row?.executed ?? 0;

        return {
          ...bucket,
          passed,
          executed,
          approvalRate: executed === 0 ? 0 : Math.round((passed / executed) * 100),
        };
      }),
      monthlyExecutions: months.map((bucket) => ({
        ...bucket,
        executions: monthlyExecutionsByKey.get(bucket.month)?.executions ?? 0,
      })),
      resultDistribution: distribution,
      topProjects,
      recentActivity: {
        executions: recentExecutions,
        casesExecuted: recentResultActivity.casesExecuted,
        failures: recentResultActivity.failures,
        approvals: recentResultActivity.approvals,
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { TestResultStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type MonthlyQualityRow = {
  month: Date;
  passed: number;
  executed: number;
};

type MonthlyExecutionsRow = {
  month: Date;
  executions: number;
};

type DistributionRow = {
  status: TestResultStatus;
  total: number;
};

type TopProjectRow = {
  projectId: string;
  key: string;
  name: string;
  executions: number;
};

type ResultSummaryRow = {
  executed: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
};

type RecentActivityRow = {
  casesExecuted: number;
  failures: number;
  approvals: number;
};

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getGlobalTotals() {
    return Promise.all([
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.testSuite.count({ where: { deletedAt: null } }),
      this.prisma.testCase.count({ where: { deletedAt: null } }),
      this.prisma.testPlan.count({ where: { deletedAt: null } }),
      this.prisma.testRun.count({ where: { deletedAt: null } }),
      this.prisma.testResult.count({
        where: { status: TestResultStatus.PASSED, testRun: { deletedAt: null } },
      }),
      this.prisma.testResult.count({
        where: { status: TestResultStatus.FAILED, testRun: { deletedAt: null } },
      }),
      this.prisma.testResult.count({
        where: { status: TestResultStatus.PENDING, testRun: { deletedAt: null } },
      }),
    ]).then(([projects, suites, cases, plans, runs, passed, failed, pending]) => ({
      projects,
      suites,
      cases,
      plans,
      runs,
      passed,
      failed,
      pending,
    }));
  }

  getCreatedEntitySummary(start: Date, end: Date) {
    const createdAt = { gte: start, lte: end };

    return Promise.all([
      this.prisma.project.count({ where: { deletedAt: null, createdAt } }),
      this.prisma.testSuite.count({ where: { deletedAt: null, createdAt } }),
      this.prisma.testCase.count({ where: { deletedAt: null, createdAt } }),
      this.prisma.testPlan.count({ where: { deletedAt: null, createdAt } }),
      this.prisma.testRun.count({ where: { deletedAt: null, createdAt } }),
    ]).then(([projects, suites, cases, plans, runs]) => ({
      projects,
      suites,
      cases,
      plans,
      runs,
    }));
  }

  async getResultSummary(start: Date, end: Date) {
    const rows = await this.prisma.$queryRaw<ResultSummaryRow[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE tr.status IN ('PASSED', 'FAILED', 'SKIPPED')
            AND tr."executedAt" BETWEEN ${start} AND ${end}
        )::int AS "executed",
        COUNT(*) FILTER (
          WHERE tr.status = 'PASSED'
            AND tr."executedAt" BETWEEN ${start} AND ${end}
        )::int AS "passed",
        COUNT(*) FILTER (
          WHERE tr.status = 'FAILED'
            AND tr."executedAt" BETWEEN ${start} AND ${end}
        )::int AS "failed",
        COUNT(*) FILTER (
          WHERE tr.status = 'SKIPPED'
            AND tr."executedAt" BETWEEN ${start} AND ${end}
        )::int AS "skipped",
        COUNT(*) FILTER (
          WHERE tr.status = 'PENDING'
            AND tr."createdAt" BETWEEN ${start} AND ${end}
        )::int AS "pending"
      FROM test_results tr
      INNER JOIN test_runs r ON r.id = tr."testRunId"
      WHERE r."deletedAt" IS NULL
    `;

    return rows[0] ?? { executed: 0, passed: 0, failed: 0, skipped: 0, pending: 0 };
  }

  getMonthlyQuality(start: Date, end: Date) {
    return this.prisma.$queryRaw<MonthlyQualityRow[]>`
      SELECT
        DATE_TRUNC('month', tr."executedAt") AS "month",
        COUNT(*) FILTER (WHERE tr.status = 'PASSED')::int AS "passed",
        COUNT(*)::int AS "executed"
      FROM test_results tr
      INNER JOIN test_runs r ON r.id = tr."testRunId"
      WHERE r."deletedAt" IS NULL
        AND tr.status IN ('PASSED', 'FAILED', 'SKIPPED')
        AND tr."executedAt" BETWEEN ${start} AND ${end}
      GROUP BY DATE_TRUNC('month', tr."executedAt")
      ORDER BY "month" ASC
    `;
  }

  getMonthlyExecutions(start: Date, end: Date) {
    return this.prisma.$queryRaw<MonthlyExecutionsRow[]>`
      SELECT
        DATE_TRUNC('month', COALESCE(r."completedAt", r."startedAt", r."createdAt")) AS "month",
        COUNT(*)::int AS "executions"
      FROM test_runs r
      WHERE r."deletedAt" IS NULL
        AND COALESCE(r."completedAt", r."startedAt", r."createdAt") BETWEEN ${start} AND ${end}
      GROUP BY DATE_TRUNC('month', COALESCE(r."completedAt", r."startedAt", r."createdAt"))
      ORDER BY "month" ASC
    `;
  }

  getResultDistribution(start: Date, end: Date) {
    return this.prisma.$queryRaw<DistributionRow[]>`
      SELECT tr.status, COUNT(*)::int AS "total"
      FROM test_results tr
      INNER JOIN test_runs r ON r.id = tr."testRunId"
      WHERE r."deletedAt" IS NULL
        AND COALESCE(tr."executedAt", tr."createdAt") BETWEEN ${start} AND ${end}
      GROUP BY tr.status
    `;
  }

  getTopProjects(start: Date, end: Date) {
    return this.prisma.$queryRaw<TopProjectRow[]>`
      SELECT
        p.id AS "projectId",
        p."key",
        p.name,
        COUNT(r.id)::int AS "executions"
      FROM projects p
      INNER JOIN test_runs r ON r."projectId" = p.id
      WHERE p."deletedAt" IS NULL
        AND r."deletedAt" IS NULL
        AND COALESCE(r."completedAt", r."startedAt", r."createdAt") BETWEEN ${start} AND ${end}
      GROUP BY p.id, p."key", p.name
      ORDER BY "executions" DESC, p.name ASC
      LIMIT 5
    `;
  }

  getRecentExecutionCount(start: Date, end: Date) {
    return this.prisma.testRun.count({
      where: {
        deletedAt: null,
        OR: [
          { completedAt: { gte: start, lte: end } },
          { startedAt: { gte: start, lte: end } },
          {
            completedAt: null,
            startedAt: null,
            createdAt: { gte: start, lte: end },
          },
        ],
      },
    });
  }

  async getRecentResultActivity(start: Date, end: Date) {
    const rows = await this.prisma.$queryRaw<RecentActivityRow[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE tr.status IN ('PASSED', 'FAILED', 'SKIPPED')
            AND tr."executedAt" BETWEEN ${start} AND ${end}
        )::int AS "casesExecuted",
        COUNT(*) FILTER (
          WHERE tr.status = 'FAILED'
            AND tr."executedAt" BETWEEN ${start} AND ${end}
        )::int AS "failures",
        COUNT(*) FILTER (
          WHERE tr.status = 'PASSED'
            AND tr."executedAt" BETWEEN ${start} AND ${end}
        )::int AS "approvals"
      FROM test_results tr
      INNER JOIN test_runs r ON r.id = tr."testRunId"
      WHERE r."deletedAt" IS NULL
    `;

    return rows[0] ?? { casesExecuted: 0, failures: 0, approvals: 0 };
  }

}

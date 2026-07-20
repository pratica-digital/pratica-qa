import type { TestResult, TestResultStatus } from '../types/testRun';

export type TestRunSummary = {
  approvalPercentage: number;
  executed: number;
  failed: number;
  notRun: number;
  passed: number;
  progressPercentage: number;
  skipped: number;
  total: number;
  byStatus: Record<TestResultStatus, number>;
};

export function summarizeTestResults(results: TestResult[]): TestRunSummary {
  const byStatus: Record<TestResultStatus, number> = {
    FAILED: 0,
    PASSED: 0,
    PENDING: 0,
    SKIPPED: 0,
  };

  for (const result of results) {
    byStatus[result.status] += 1;
  }

  const total = results.length;
  const executed = total - byStatus.PENDING;

  return {
    approvalPercentage: executed === 0 ? 0 : Math.round((byStatus.PASSED / executed) * 100),
    byStatus,
    executed,
    failed: byStatus.FAILED,
    notRun: byStatus.PENDING,
    passed: byStatus.PASSED,
    progressPercentage: total === 0 ? 0 : Math.round((executed / total) * 100),
    skipped: byStatus.SKIPPED,
    total,
  };
}

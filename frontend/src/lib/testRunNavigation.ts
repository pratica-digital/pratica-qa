import type { TestResult, TestRun, TestRunSuite } from "../types/testRun";
import { summarizeTestResults, type TestRunSummary } from "./testRunSummary";

export const WITHOUT_SUITE_ID = "without-suite";

export type TestRunSuiteGroup = {
  id: string;
  name: string;
  position: number;
  results: TestResult[];
  summary: TestRunSummary;
};

export function getExecutionSuiteId(result: TestResult) {
  return result.testCase.suiteId ?? WITHOUT_SUITE_ID;
}

export function sortExecutionSuites(suites: TestRunSuite[] = []) {
  return [...suites].sort(
    (left, right) =>
      left.position - right.position || left.id.localeCompare(right.id),
  );
}

export function sortExecutionResults(
  run: TestRun,
  results: TestResult[] = run.results ?? [],
) {
  const originalIndex = new Map(
    results.map((result, index) => [result.id, index]),
  );
  const suiteIndex = new Map(
    sortExecutionSuites(run.suites).map((suite, index) => [
      suite.testSuiteId,
      index,
    ]),
  );

  return [...results].sort((left, right) => {
    const explicitPosition = (left.position ?? 0) - (right.position ?? 0);
    if (
      (left.position ?? 0) > 0 &&
      (right.position ?? 0) > 0 &&
      explicitPosition !== 0
    ) {
      return explicitPosition;
    }

    const suiteDifference =
      (suiteIndex.get(getExecutionSuiteId(left)) ?? Number.MAX_SAFE_INTEGER) -
      (suiteIndex.get(getExecutionSuiteId(right)) ?? Number.MAX_SAFE_INTEGER);
    const caseDifference =
      (left.testCase.position ?? 0) - (right.testCase.position ?? 0);

    return (
      suiteDifference ||
      caseDifference ||
      (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0)
    );
  });
}

export function groupExecutionResults(
  run: TestRun,
  results: TestResult[] = run.results ?? [],
) {
  const orderedResults = sortExecutionResults(run, results);
  const resultsBySuite = new Map<string, TestResult[]>();

  for (const result of orderedResults) {
    const suiteId = getExecutionSuiteId(result);
    resultsBySuite.set(suiteId, [
      ...(resultsBySuite.get(suiteId) ?? []),
      result,
    ]);
  }

  const groups: TestRunSuiteGroup[] = sortExecutionSuites(run.suites).map(
    (suite) => {
      const suiteResults = resultsBySuite.get(suite.testSuiteId) ?? [];
      resultsBySuite.delete(suite.testSuiteId);
      return {
        id: suite.testSuiteId,
        name: suite.testSuite?.name ?? "Suíte sem nome",
        position: suite.position,
        results: suiteResults,
        summary: summarizeTestResults(suiteResults),
      };
    },
  );

  const unassignedResults = [...resultsBySuite.values()].flat();
  if (unassignedResults.length > 0) {
    groups.push({
      id: WITHOUT_SUITE_ID,
      name: "Sem suíte",
      position: Number.MAX_SAFE_INTEGER,
      results: unassignedResults,
      summary: summarizeTestResults(unassignedResults),
    });
  }

  return groups;
}

export function getGlobalResultPosition(
  results: TestResult[],
  resultId: string,
) {
  const index = results.findIndex((result) => result.id === resultId);
  return index === -1 ? null : index + 1;
}

export function getAdjacentResult(
  results: TestResult[],
  resultId: string,
  direction: -1 | 1,
) {
  const position = getGlobalResultPosition(results, resultId);
  return position === null ? null : (results[position - 1 + direction] ?? null);
}

export function resolveActiveResultId(
  results: TestResult[],
  storedResultId?: string | null,
) {
  if (
    storedResultId &&
    results.some((result) => result.id === storedResultId)
  ) {
    return storedResultId;
  }

  return (
    results.find((result) => result.status === "PENDING")?.id ??
    results[0]?.id ??
    null
  );
}

import type { ManagedTestCase, ManagedTestSuite } from "../types/testRun";

export type AddTestRunSelectionSummary = {
  duplicateCaseIds: string[];
  newCaseIds: string[];
  selectedCaseIds: string[];
  selectedSuiteIds: string[];
};

export function getCasesForSuite(cases: ManagedTestCase[], suiteId: string) {
  return cases
    .filter(
      (testCase) =>
        testCase.suiteId === suiteId && testCase.status === "ACTIVE",
    )
    .sort(
      (left, right) =>
        left.position - right.position || left.id.localeCompare(right.id),
    );
}

export function toggleSuiteCases(
  selectedCaseIds: Set<string>,
  suiteCases: ManagedTestCase[],
) {
  const next = new Set(selectedCaseIds);
  const activeCaseIds = suiteCases
    .filter((testCase) => testCase.status === "ACTIVE")
    .map((testCase) => testCase.id);
  const shouldSelect = activeCaseIds.some((caseId) => !next.has(caseId));

  for (const caseId of activeCaseIds) {
    if (shouldSelect) {
      next.add(caseId);
    } else {
      next.delete(caseId);
    }
  }

  return next;
}

export function summarizeAddTestRunSelection(
  suites: ManagedTestSuite[],
  cases: ManagedTestCase[],
  selectedCaseIds: Set<string>,
  existingRunCaseIds: Set<string>,
): AddTestRunSelectionSummary {
  const activeCases = cases.filter(
    (testCase) =>
      testCase.status === "ACTIVE" && selectedCaseIds.has(testCase.id),
  );
  const selectedIds = activeCases.map((testCase) => testCase.id);
  const selectedSuiteIds = suites
    .filter((suite) => {
      const suiteCases = getCasesForSuite(cases, suite.id);
      return (
        suiteCases.length > 0 &&
        suiteCases.every((testCase) => selectedCaseIds.has(testCase.id))
      );
    })
    .map((suite) => suite.id);
  const selectedSuiteIdSet = new Set(selectedSuiteIds);

  return {
    selectedSuiteIds,
    selectedCaseIds: activeCases
      .filter((testCase) => !selectedSuiteIdSet.has(testCase.suiteId))
      .map((testCase) => testCase.id),
    newCaseIds: selectedIds.filter((caseId) => !existingRunCaseIds.has(caseId)),
    duplicateCaseIds: selectedIds.filter((caseId) =>
      existingRunCaseIds.has(caseId),
    ),
  };
}

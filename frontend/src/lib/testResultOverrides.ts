import type { RunnerTestCase, TestResult, TestStep } from '../types/testRun';

function normalizeOverrideSteps(result: TestResult): TestStep[] | undefined {
  if (!Array.isArray(result.stepsOverride)) {
    return undefined;
  }

  return result.stepsOverride.map((step, index) => ({
    id: step.id || `${result.id}-step-${index + 1}`,
    order: step.order || index + 1,
    description: step.description,
    expectedResult: step.expectedResult ?? '',
  }));
}

export function getResultTestCase(result: TestResult): RunnerTestCase {
  return {
    ...result.testCase,
    title: result.titleOverride ?? result.testCase.title,
    description: result.descriptionOverride ?? result.testCase.description,
    expectedResult: result.expectedResultOverride ?? result.testCase.expectedResult,
    steps: normalizeOverrideSteps(result) ?? result.testCase.steps,
  };
}

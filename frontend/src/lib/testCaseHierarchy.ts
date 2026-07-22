import type { ManagedTestCase, ManagedTestSuite } from '../types/testRun';

function isMeaningfulLabel(value?: string | null) {
  const normalizedValue = value?.trim();
  return Boolean(
    normalizedValue &&
      !['untitled', 'null', 'undefined'].includes(normalizedValue.toLowerCase()),
  );
}

export function getCaseProjectName(testCase: ManagedTestCase, suites: ManagedTestSuite[]) {
  const suite = suites.find((item) => item.id === testCase.suiteId);
  const caseSuite = suite ?? testCase.suite;
  const projects = caseSuite?.projects
    ?.map((project) => project.name?.trim())
    .filter((name): name is string => isMeaningfulLabel(name)) ?? [];

  return projects.length > 0 ? projects.join(', ') : undefined;
}

export function getCaseHierarchy(testCase: ManagedTestCase, suites: ManagedTestSuite[]) {
  const suite = suites.find((item) => item.id === testCase.suiteId);
  const caseSuite = suite ?? testCase.suite;
  const projectName = getCaseProjectName(testCase, suites);
  const suiteName = caseSuite?.name?.trim();
  const sectionName = testCase.section?.trim();

  return [
    projectName,
    isMeaningfulLabel(suiteName) ? suiteName : undefined,
    isMeaningfulLabel(sectionName) ? sectionName : undefined,
  ].filter((label): label is string => Boolean(label));
}

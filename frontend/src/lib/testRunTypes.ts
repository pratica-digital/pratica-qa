import type {
  TestResult,
  TestRun,
  TestRunTestType,
} from "../types/testRun";

export const TEST_RUN_TYPE_OPTIONS: ReadonlyArray<{
  type: TestRunTestType;
  label: string;
  description: string;
}> = [
  {
    type: "SMOKE",
    label: "Smoke",
    description: "Checagens críticas antes da execução detalhada",
  },
  {
    type: "FUNCIONAL",
    label: "Funcional",
    description: "Comportamento das funcionalidades e cobertura de aceite",
  },
  {
    type: "REGRESSAO",
    label: "Regressão",
    description: "Fluxos existentes que precisam continuar funcionando",
  },
  {
    type: "ROBUSTEZ",
    label: "Robustez",
    description: "Cenários de limite, resiliência e estresse",
  },
];

const TEST_RUN_TYPE_LABELS = Object.fromEntries(
  TEST_RUN_TYPE_OPTIONS.map(({ type, label }) => [type, label]),
) as Record<TestRunTestType, string>;

export const TEST_RUN_TYPE_NOT_DEFINED = "Tipo de teste não definido";

export function testRunTypeLabel(type?: TestRunTestType | null) {
  return type ? TEST_RUN_TYPE_LABELS[type] ?? type : TEST_RUN_TYPE_NOT_DEFINED;
}

export function uniqueTestRunTypes(
  types: Array<TestRunTestType | null | undefined>,
) {
  return [...new Set(types.filter((type): type is TestRunTestType => Boolean(type)))];
}

export function getTestRunTypes(testRun: Pick<TestRun, "suites">) {
  return uniqueTestRunTypes((testRun.suites ?? []).map((suite) => suite.testType));
}

export function formatTestRunTypes(
  types: Array<TestRunTestType | null | undefined>,
) {
  const labels = uniqueTestRunTypes(types).map(testRunTypeLabel);

  return labels.length > 0
    ? new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" }).format(labels)
    : TEST_RUN_TYPE_NOT_DEFINED;
}

export function formatTestRunTypesFromRun(testRun: Pick<TestRun, "suites">) {
  return formatTestRunTypes(getTestRunTypes(testRun));
}

export function testRunTypesSuccessMessage(
  action: "created" | "updated",
  testRun: Pick<TestRun, "suites">,
) {
  const operation = action === "created" ? "criada" : "atualizada";
  return `Execução ${operation} com sucesso. Tipos associados: ${formatTestRunTypesFromRun(testRun)}.`;
}

export type TestRunTypeResultSummary = {
  type: TestRunTestType | null;
  label: string;
  total: number;
  passed: number;
  failed: number;
};

export function summarizeResultsByTestType(
  testRun: Pick<TestRun, "suites">,
  results: TestResult[],
): TestRunTypeResultSummary[] {
  const typeBySuiteId = new Map<string, TestRunTestType>();

  for (const suite of testRun.suites ?? []) {
    if (suite.testSuiteId && suite.testType && !typeBySuiteId.has(suite.testSuiteId)) {
      typeBySuiteId.set(suite.testSuiteId, suite.testType);
    }
  }

  const summaries = new Map<TestRunTestType | null, TestRunTypeResultSummary>();

  for (const result of results) {
    const type = typeBySuiteId.get(result.testCase?.suiteId ?? "") ?? null;
    const summary = summaries.get(type) ?? {
      type,
      label: testRunTypeLabel(type),
      total: 0,
      passed: 0,
      failed: 0,
    };

    summary.total += 1;
    if (result.status === "PASSED") summary.passed += 1;
    if (result.status === "FAILED") summary.failed += 1;
    summaries.set(type, summary);
  }

  const order = new Map(TEST_RUN_TYPE_OPTIONS.map(({ type }, index) => [type, index]));

  return [...summaries.values()].sort(
    (left, right) =>
      (left.type === null ? Number.MAX_SAFE_INTEGER : (order.get(left.type) ?? 99)) -
      (right.type === null ? Number.MAX_SAFE_INTEGER : (order.get(right.type) ?? 99)),
  );
}

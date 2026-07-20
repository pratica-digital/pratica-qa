export type UserRole = "ADMIN" | "QA" | "VIEWER";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  firstAccess?: boolean;
  passwordChangedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  role?: UserRole;
  status?: UserStatus;
};

export type UpdateUserPayload = Partial<CreateUserPayload>;

export type UserEmailNotificationResponse = {
  user: AuthUser;
  message: string;
  token: string;
  link: string;
  emailSent: boolean;
  emailError?: string;
};

export type TestRunStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type TestRunTestType = "SMOKE" | "FUNCIONAL" | "REGRESSAO" | "ROBUSTEZ";

export type TestResultStatus = "PENDING" | "PASSED" | "FAILED" | "SKIPPED";

export type DashboardPeriod = "30d" | "90d" | "6m" | "12m";

export type TestPriority = "LOW" | "MEDIUM" | "HIGH";

export type TestSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TestCaseStatus = "ACTIVE" | "ARCHIVED";

export type TestSuiteStatus = "ACTIVE" | "ARCHIVED";

export type ProjectStatus = "ACTIVE" | "ARCHIVED";

export type ProjectCategory = "BAKERY_OVENS" | "COMBI_OVENS" | "SPEED_OVENS";

export type ProjectCategoryLabel =
  | "Fornos de Panificação"
  | "Fornos Combinados"
  | "Speed Ovens";

export const PROJECT_CATEGORY_MAP: Record<
  ProjectCategory,
  ProjectCategoryLabel
> = {
  BAKERY_OVENS: "Fornos de Panificação",
  COMBI_OVENS: "Fornos Combinados",
  SPEED_OVENS: "Speed Ovens",
};

export const PROJECT_CATEGORY_ORDER: ProjectCategory[] = [
  "BAKERY_OVENS",
  "COMBI_OVENS",
  "SPEED_OVENS",
];

export type TestStep = {
  id: string;
  order: number;
  description: string;
  expectedResult?: string | null;
};

export type RunnerTestCase = {
  id: string;
  title: string;
  suiteId?: string;
  position?: number;
  description?: string;
  expectedResult?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  severity?: TestSeverity;
  status?: string;
  suite?: {
    id: string;
    name: string;
    projects?: Array<{
      id: string;
      name: string;
    }>;
  };
  steps?: TestStep[];
};

export type TestResultAttachment = {
  id: string;
  testResultId: string;
  testRunId: string;
  testCaseId: string;
  testStepId?: string | null;
  uploadedById?: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  uploadedBy?: AuthUser | null;
  testStep?: TestStep | null;
};

export type ProjectSummary = {
  id: string;
  key?: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  category?: ProjectCategory;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    suites?: number;
    testPlans?: number;
    testRuns?: number;
  };
};

export type ManagedTestSuite = {
  id: string;
  name: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
  projects?: Array<{
    id: string;
    key: string;
    name: string;
  }>;
  _count?: {
    testCases: number;
  };
};

export type ManagedTestCase = {
  id: string;
  suiteId: string;
  title: string;
  position: number;
  description: string;
  preconditions?: string;
  expectedResult: string;
  section?: string;
  status: TestCaseStatus;
  priority?: TestPriority;
  severity?: TestSeverity;
  version?: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  suite?: {
    id: string;
    name: string;
    projects?: Array<{
      id: string;
      name: string;
    }>;
  };
  steps: TestStep[];
};

export type TestResult = {
  id: string;
  testRunId?: string;
  testCaseId: string;
  status: TestResultStatus;
  position?: number;
  comment?: string;
  titleOverride?: string | null;
  descriptionOverride?: string | null;
  expectedResultOverride?: string | null;
  stepsOverride?: TestStep[] | null;
  attachments?: TestResultAttachment[];
  legacyAttachments?: string[];
  shortcutCreatedAt?: string | null;
  shortcutStoryId?: string | null;
  shortcutStoryName?: string | null;
  shortcutStoryUrl?: string | null;
  executedAt?: string | null;
  removedAt?: string | null;
  executedBy?: AuthUser | null;
  lastModifiedBy?: AuthUser | null;
  updatedAt?: string;
  history?: TestResultHistory[];
  testRun?: {
    id: string;
    name: string;
    status: TestRunStatus;
    testPlanId?: string | null;
    projectId?: string | null;
    assignedToId?: string | null;
    completedAt?: string | null;
    updatedAt?: string;
    deletedAt?: string | null;
    project?: {
      id: string;
      name: string;
    };
  };
  testCase: RunnerTestCase;
};

export type TestResultHistory = {
  id: string;
  testResultId: string;
  actorUserId?: string | null;
  previousStatus?: TestResultStatus | null;
  newStatus?: TestResultStatus | null;
  previousComment?: string;
  newComment?: string;
  addedAttachments?: string[];
  removedAttachments?: string[];
  createdAt: string;
  actor?: AuthUser | null;
};

export type TestRunSuite = {
  id: string;
  testSuiteId: string;
  testType?: TestRunTestType;
  position: number;
  testSuite?: {
    id: string;
    name: string;
    projects?: Array<{
      id: string;
      name: string;
    }>;
  };
};

export type TestRun = {
  id: string;
  projectId?: string;
  testPlanId?: string;
  assignedToId: string;
  name: string;
  description?: string;
  status: TestRunStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: {
    id: string;
    key: string;
    name: string;
  };
  testPlan?: {
    id: string;
    name: string;
    version: string;
  };
  assignedTo?: AuthUser;
  suites?: TestRunSuite[];
  results?: TestResult[];
};

export type CreateTestRunPayload = {
  projectId?: string;
  testPlanId?: string;
  assignedToId: string;
  name: string;
  description?: string;
  testTypes: Array<{
    type: TestRunTestType;
    suites: string[];
  }>;
};

export type TestPlanSection = {
  type?: string;
  title: string;
  content: string;
  priority?: TestPriority;
};

export type TestPlan = {
  id: string;
  projectId: string;
  name: string;
  version: string;
  description?: string;
  sections?: TestPlanSection[];
  createdAt?: string;
  updatedAt?: string;
  project?: {
    id: string;
    key?: string;
    name: string;
  };
  _count?: {
    testRuns?: number;
  };
};

export type PaginatedResponse<T> = {
  data: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};

export type DashboardMetricDelta = {
  value: number;
  percent: number;
  direction: "up" | "down" | "flat";
};

export type DashboardAnalytics = {
  period: DashboardPeriod;
  periodLabel: string;
  generatedAt: string;
  range: {
    start: string;
    end: string;
  };
  totals: {
    projects: number;
    suites: number;
    cases: number;
    plans: number;
    runs: number;
    passed: number;
    failed: number;
    pending: number;
  };
  metricDeltas: Record<
    | "projects"
    | "suites"
    | "cases"
    | "plans"
    | "runs"
    | "passed"
    | "failed"
    | "pending",
    DashboardMetricDelta
  >;
  monthlyQuality: Array<{
    month: string;
    label: string;
    passed: number;
    executed: number;
    approvalRate: number;
  }>;
  monthlyExecutions: Array<{
    month: string;
    label: string;
    executions: number;
  }>;
  resultDistribution: {
    passed: number;
    failed: number;
    blocked: number;
    notExecuted: number;
  };
  topProjects: Array<{
    projectId: string;
    key: string;
    name: string;
    executions: number;
  }>;
  recentActivity: {
    executions: number;
    casesExecuted: number;
    failures: number;
    approvals: number;
  };
};

export type ExecuteTestResultPayload = {
  testResultId?: string;
  testCaseId?: string;
  status: TestResultStatus;
  comment?: string;
};

export type UpdateTestResultPayload = Partial<{
  status: TestResultStatus;
  comment: string;
  title: string;
  description: string;
  expectedResult: string;
  steps: ReplaceTestStepsPayload["steps"];
}>;

export type CreateTestResultPayload = {
  testRunId: string;
  testCaseId: string;
  status: TestResultStatus;
  comment?: string;
  executedById?: string;
};

export type UpdateTestCasePayload = Partial<{
  suiteId: string;
  title: string;
  description: string;
  expectedResult: string;
  section: string;
  status: TestCaseStatus;
  priority: TestPriority;
  severity: TestSeverity;
}>;

export type ReplaceTestStepsPayload = {
  steps: Array<{
    order: number;
    description: string;
    expectedResult?: string;
  }>;
};

export type CreateTestCasePayload = {
  suiteId: string;
  title: string;
  description?: string;
  expectedResult?: string;
  section?: string;
  status?: TestCaseStatus;
  priority?: TestPriority;
  severity?: TestSeverity;
  steps?: ReplaceTestStepsPayload["steps"];
};

export type ImportTestCasePayload = {
  rowNumber: number;
  title: string;
  description?: string;
  expectedResults?: string;
  section?: string;
  testSteps?: Array<{
    order: number;
    description: string;
    expectedResult?: string;
  }>;
};

export type ImportTestCasesPayload = {
  requireExpectedResults?: boolean;
  cases: ImportTestCasePayload[];
};

export type ImportTestCasesReport = {
  imported: number;
  skipped: number;
  ignoredEmptyRows?: number;
  createdSections: string[];
  errors: Array<{
    rowNumber: number;
    message: string;
  }>;
};

export type AiProviderName = "openrouter";

export type AiSettings = {
  id?: string;
  provider: AiProviderName;
  model: string;
  endpoint: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  retries: number;
  streaming: boolean;
  promptBase: string;
  promptUser: string;
  updatedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type AiReleaseSection = {
  title: string;
  present: boolean;
};

export type AiExtractedRelease = {
  fileName: string;
  mimeType: string;
  size: number;
  hash: string;
  text: string;
  sections: AiReleaseSection[];
};

export type AiReleaseChange = {
  id: string;
  modulo: string;
  tipo: string;
  descricao: string;
  categoria: string;
  impacto: string;
  origem: string;
  trecho_release: string;
  prioridade: "baixa" | "media" | "alta" | "critica";
  riscos: string[];
  funcionalidades_afetadas: string[];
  dependencias: string[];
};

export type AiReleaseAnalysis = {
  modulo_principal: string;
  resumo: string;
  changes: AiReleaseChange[];
};

export type AiGeneratedStep = {
  descricao: string;
  resultado_esperado?: string;
};

export type AiGeneratedTestCase = {
  id: string;
  titulo: string;
  descricao: string;
  pre_condicoes: string;
  passos: AiGeneratedStep[];
  resultado_esperado: string;
  prioridade: string;
  severidade: string;
  categoria: string;
  modulo: string;
  tipo_teste: string;
  teste_positivo: string;
  teste_negativo: string;
  regressao: string;
  automacao: string;
  risco: string;
  dados_teste: string[];
  funcionalidades_afetadas: string[];
  origem_release: string;
  trecho_release: string;
  complexidade: string;
  probabilidade_regressao: string;
};

export type AiRegressionSuiteItem = {
  case_id: string;
  titulo: string;
  risco: string;
  justificativa: string;
};

export type AiCoverage = {
  novas_funcionalidades: number;
  melhorias: number;
  correcoes: number;
  eventos: number;
};

export type AiGenerationRecord = {
  id: string;
  releaseTitle: string;
  fileName: string;
  releaseHash: string;
  releaseText: string;
  analysis: AiReleaseAnalysis;
  testCases: AiGeneratedTestCase[];
  regressionSuite: AiRegressionSuiteItem[];
  coverage: AiCoverage;
  provider: string;
  model: string;
  status: string;
  durationMs?: number | null;
  casesCreated: number;
  createdById?: string | null;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  cached?: boolean;
};

export type AiHistoryItem = Omit<
  AiGenerationRecord,
  "releaseText" | "analysis" | "testCases" | "regressionSuite" | "coverage"
> & {
  testCaseCount: number;
};

export type UpdateTestSuitePayload = Partial<{
  name: string;
  position: number;
  projectIds: string[];
}>;

export type CreateTestSuitePayload = {
  projectIds?: string[];
  name: string;
  position?: number;
};

export type CreateTestPlanPayload = {
  projectId: string;
  name: string;
  version: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
};

export type UpdateTestPlanPayload = Partial<{
  name: string;
  version: string;
  description: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}>;

export type CreateProjectPayload = {
  name: string;
  key?: string;
  description?: string;
  category?: ProjectCategory;
  imageFile?: File | null;
};

export type UpdateProjectPayload = Partial<{
  name: string;
  description: string;
  status: ProjectStatus;
  category: ProjectCategory;
  imageFile: File | null;
  removeImage: boolean;
}>;

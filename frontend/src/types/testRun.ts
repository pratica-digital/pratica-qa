export type UserRole = 'ADMIN' | 'QA' | 'VIEWER';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

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

export type TestRunStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type TestRunTestType = 'SMOKE' | 'FUNCIONAL' | 'REGRESSAO' | 'ROBUSTEZ';

export type TestResultStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';

export type DashboardPeriod = '30d' | '90d' | '6m' | '12m';

export type TestPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type TestSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TestCaseStatus = 'ACTIVE' | 'ARCHIVED';

export type TestSuiteStatus = 'ACTIVE' | 'ARCHIVED';

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export type ProjectCategory = 'BAKERY_OVENS' | 'COMBI_OVENS' | 'SPEED_OVENS';

export type ProjectCategoryLabel = 'Fornos de Panificação' | 'Fornos Combinados' | 'Speed Ovens';

export const PROJECT_CATEGORY_MAP: Record<ProjectCategory, ProjectCategoryLabel> = {
  BAKERY_OVENS: 'Fornos de Panificação',
  COMBI_OVENS: 'Fornos Combinados',
  SPEED_OVENS: 'Speed Ovens',
};

export const PROJECT_CATEGORY_ORDER: ProjectCategory[] = [
  'BAKERY_OVENS',
  'COMBI_OVENS',
  'SPEED_OVENS',
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
  description?: string;
  expectedResult?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  severity?: TestSeverity;
  status?: string;
  suite?: {
    id: string;
    name: string;
    projectId: string;
    project?: {
      id: string;
      name: string;
    };
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
  projectId: string;
  name: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
  project?: {
    id: string;
    key: string;
    name: string;
  };
  _count?: {
    testCases: number;
  };
};

export type ManagedTestCase = {
  id: string;
  suiteId: string;
  title: string;
  description: string;
  preconditions?: string;
  expectedResult: string;
  status: TestCaseStatus;
  severity?: TestSeverity;
  version?: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  suite?: {
    id: string;
    name: string;
    projectId: string;
    project?: {
      id: string;
      name: string;
    };
  };
  steps: TestStep[];
};

export type TestResult = {
  id: string;
  testRunId?: string;
  testCaseId: string;
  status: TestResultStatus;
  comment?: string;
  attachments?: TestResultAttachment[];
  legacyAttachments?: string[];
  executedAt?: string | null;
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
    projectId: string;
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
  direction: 'up' | 'down' | 'flat';
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
    'projects' | 'suites' | 'cases' | 'plans' | 'runs' | 'passed' | 'failed' | 'pending',
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

export type UpdateTestResultPayload = {
  status: TestResultStatus;
  comment?: string;
};

export type CreateTestResultPayload = UpdateTestResultPayload & {
  testRunId: string;
  testCaseId: string;
  executedById?: string;
};

export type UpdateTestCasePayload = Partial<{
  title: string;
  description: string;
  expectedResult: string;
  status: TestCaseStatus;
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
  status?: TestCaseStatus;
  severity?: TestSeverity;
  steps?: ReplaceTestStepsPayload['steps'];
};

export type UpdateTestSuitePayload = Partial<{
  name: string;
  position: number;
}>;

export type CreateTestSuitePayload = {
  projectId: string;
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

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

export type TemporaryPasswordResponse = {
  user: AuthUser;
  temporaryPassword: string;
};

export type TestRunStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type TestRunTestType = 'SMOKE' | 'FUNCIONAL' | 'REGRESSAO' | 'ROBUSTEZ';

export type TestResultStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';

export type TestPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type TestSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TestCaseStatus = 'ACTIVE' | 'ARCHIVED';

export type TestSuiteStatus = 'ACTIVE' | 'ARCHIVED';

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
  status?: string;
  steps?: TestStep[];
};

export type ProjectSummary = {
  id: string;
  key?: string;
  name: string;
  description?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
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
  description: string;
  status: TestSuiteStatus;
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
  priority: TestPriority;
  severity?: TestSeverity;
  version?: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  suite?: {
    id: string;
    name: string;
    projectId: string;
  };
  steps: TestStep[];
};

export type TestResult = {
  id: string;
  testRunId?: string;
  testCaseId: string;
  status: TestResultStatus;
  comment?: string;
  attachments?: string[];
  executedAt?: string | null;
  executedBy?: AuthUser | null;
  testRun?: {
    id: string;
    name: string;
    status: TestRunStatus;
    testPlanId?: string | null;
    assignedToId?: string | null;
    completedAt?: string | null;
    deletedAt?: string | null;
  };
  testCase: RunnerTestCase;
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

export type ExecuteTestResultPayload = {
  testResultId?: string;
  testCaseId?: string;
  status: Exclude<TestResultStatus, 'PENDING'>;
  comment?: string;
  attachments?: string[];
};

export type UpdateTestResultPayload = {
  status: Exclude<TestResultStatus, 'PENDING'>;
  comment?: string;
  attachments?: string[];
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
  priority: TestPriority;
  severity: TestSeverity;
  tags: string[];
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
  priority?: TestPriority;
  severity?: TestSeverity;
  tags?: string[];
  steps?: ReplaceTestStepsPayload['steps'];
};

export type UpdateTestSuitePayload = Partial<{
  name: string;
  description: string;
  status: TestSuiteStatus;
  position: number;
}>;

export type CreateTestSuitePayload = {
  projectId: string;
  name: string;
  description?: string;
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
  key: string;
  description?: string;
};

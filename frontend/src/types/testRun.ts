export type UserRole = 'ADMIN' | 'QA' | 'VIEWER';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type TestRunStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type TestResultStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';

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

export type TestResult = {
  id: string;
  testRunId?: string;
  testCaseId: string;
  status: TestResultStatus;
  comment?: string;
  attachments?: string[];
  executedAt?: string | null;
  executedBy?: AuthUser | null;
  testCase: RunnerTestCase;
};

export type TestRunSuite = {
  id: string;
  testSuiteId: string;
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

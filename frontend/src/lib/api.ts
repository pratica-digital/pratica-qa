import type {
  AuthUser,
  CreateUserPayload,
  CreateProjectPayload,
  CreateTestCasePayload,
  CreateTestPlanPayload,
  CreateTestResultPayload,
  CreateTestSuitePayload,
  ExecuteTestResultPayload,
  ManagedTestCase,
  ManagedTestSuite,
  PaginatedResponse,
  ProjectSummary,
  ReplaceTestStepsPayload,
  TestPlan,
  TestResult,
  TestRun,
  TemporaryPasswordResponse,
  UpdateTestCasePayload,
  UpdateTestPlanPayload,
  UpdateTestSuitePayload,
  UpdateUserPayload,
} from '../types/testRun';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  signal?: AbortSignal;
};

type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  user: AuthUser;
};

type PasswordRecoveryResponse = {
  message: string;
  resetToken?: string;
  expiresAt?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function buildUrl(path: string) {
  if (path.startsWith('http')) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  return query.toString();
}

function withQuery(path: string, params: Record<string, string | number | undefined> = {}) {
  const query = buildQuery(params);
  return query ? `${path}?${query}` : path;
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string | string[] };

    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }

    return data.message ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function unwrapList<T>(response: T[] | PaginatedResponse<T>) {
  return Array.isArray(response) ? response : response.data;
}

function unwrapPage<T>(response: T[] | PaginatedResponse<T>): PaginatedResponse<T> {
  if (Array.isArray(response)) {
    return {
      data: response,
      meta: {
        total: response.length,
        page: 1,
        limit: response.length,
      },
    };
  }

  return response;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  me: (token: string) => apiRequest<AuthUser>('/users/me', { token }),
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    apiRequest<AuthUser>('/auth/change-password', {
      method: 'POST',
      token,
      body: { currentPassword, newPassword },
    }),
  requestPasswordRecovery: (email: string) =>
    apiRequest<PasswordRecoveryResponse>('/auth/password-recovery', {
      method: 'POST',
      body: { email },
    }),
  resetPassword: (email: string, token: string, newPassword: string) =>
    apiRequest<AuthUser>('/auth/password-reset', {
      method: 'POST',
      body: { email, token, newPassword },
    }),
};

export const usersApi = {
  list: async (token: string) => {
    const response = await apiRequest<AuthUser[] | PaginatedResponse<AuthUser>>('/users?limit=100', {
      token,
    });

    return unwrapList(response);
  },
  create: (token: string, payload: CreateUserPayload) =>
    apiRequest<TemporaryPasswordResponse>('/users', {
      method: 'POST',
      token,
      body: payload,
    }),
  update: (token: string, userId: string, payload: UpdateUserPayload) =>
    apiRequest<AuthUser>(`/users/${userId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),
  updateMe: (token: string, payload: Pick<CreateUserPayload, 'name' | 'email'>) =>
    apiRequest<AuthUser>('/users/me', {
      method: 'PATCH',
      token,
      body: payload,
    }),
  activate: (token: string, userId: string) =>
    apiRequest<AuthUser>(`/users/${userId}/activate`, {
      method: 'POST',
      token,
    }),
  deactivate: (token: string, userId: string) =>
    apiRequest<AuthUser>(`/users/${userId}/deactivate`, {
      method: 'POST',
      token,
    }),
  resetPassword: (token: string, userId: string) =>
    apiRequest<TemporaryPasswordResponse>(`/users/${userId}/reset-password`, {
      method: 'POST',
      token,
    }),
};

export const projectsApi = {
  listPage: async (token: string, params: { search?: string; status?: string; limit?: number } = {}) => {
    const response = await apiRequest<ProjectSummary[] | PaginatedResponse<ProjectSummary>>(
      withQuery('/projects', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapPage(response);
  },
  list: async (token: string) => {
    const response = await apiRequest<ProjectSummary[] | PaginatedResponse<ProjectSummary>>(
      '/projects?limit=100',
      {
        token,
      },
    );

    return unwrapList(response);
  },
  get: (token: string, projectId: string) =>
    apiRequest<ProjectSummary>(`/projects/${projectId}`, { token }),
  create: (token: string, payload: CreateProjectPayload) =>
    apiRequest<ProjectSummary>('/projects', {
      method: 'POST',
      token,
      body: payload,
    }),
  remove: (token: string, projectId: string) =>
    apiRequest<void>(`/projects/${projectId}`, {
      method: 'DELETE',
      token,
    }),
};

export const testSuitesApi = {
  listPage: async (
    token: string,
    params: { projectId?: string; search?: string; status?: string; limit?: number } = {},
  ) => {
    const response = await apiRequest<ManagedTestSuite[] | PaginatedResponse<ManagedTestSuite>>(
      withQuery('/test-suites', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapPage(response);
  },
  list: async (
    token: string,
    params: { projectId?: string; search?: string; status?: string; limit?: number } = {},
  ) => {
    const response = await apiRequest<ManagedTestSuite[] | PaginatedResponse<ManagedTestSuite>>(
      withQuery('/test-suites', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapList(response);
  },
  get: (token: string, testSuiteId: string) =>
    apiRequest<ManagedTestSuite>(`/test-suites/${testSuiteId}`, { token }),
  create: (token: string, payload: CreateTestSuitePayload) =>
    apiRequest<ManagedTestSuite>('/test-suites', {
      method: 'POST',
      token,
      body: payload,
    }),
  update: (token: string, testSuiteId: string, payload: UpdateTestSuitePayload) =>
    apiRequest<ManagedTestSuite>(`/test-suites/${testSuiteId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),
  remove: (token: string, testSuiteId: string) =>
    apiRequest<void>(`/test-suites/${testSuiteId}`, {
      method: 'DELETE',
      token,
    }),
};

export const testPlansApi = {
  listPage: async (
    token: string,
    params: { projectId?: string; search?: string; version?: string; limit?: number } = {},
  ) => {
    const response = await apiRequest<TestPlan[] | PaginatedResponse<TestPlan>>(
      withQuery('/test-plans', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapPage(response);
  },
  list: async (
    token: string,
    params: { projectId?: string; search?: string; version?: string; limit?: number } = {},
  ) => {
    const response = await apiRequest<TestPlan[] | PaginatedResponse<TestPlan>>(
      withQuery('/test-plans', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapList(response);
  },
  get: (token: string, testPlanId: string) =>
    apiRequest<TestPlan>(`/test-plans/${testPlanId}`, { token }),
  create: (token: string, payload: CreateTestPlanPayload) =>
    apiRequest<TestPlan>('/test-plans', {
      method: 'POST',
      token,
      body: payload,
    }),
  update: (token: string, testPlanId: string, payload: UpdateTestPlanPayload) =>
    apiRequest<TestPlan>(`/test-plans/${testPlanId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),
  remove: (token: string, testPlanId: string) =>
    apiRequest<void>(`/test-plans/${testPlanId}`, {
      method: 'DELETE',
      token,
    }),
};

export const testCasesApi = {
  listPage: async (
    token: string,
    params: {
      suiteId?: string;
      projectId?: string;
      search?: string;
      tag?: string;
      status?: string;
      priority?: string;
      severity?: string;
      limit?: number;
    } = {},
  ) => {
    const response = await apiRequest<ManagedTestCase[] | PaginatedResponse<ManagedTestCase>>(
      withQuery('/test-cases', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapPage(response);
  },
  list: async (
    token: string,
    params: {
      suiteId?: string;
      projectId?: string;
      search?: string;
      tag?: string;
      status?: string;
      priority?: string;
      severity?: string;
      limit?: number;
    } = {},
  ) => {
    const response = await apiRequest<ManagedTestCase[] | PaginatedResponse<ManagedTestCase>>(
      withQuery('/test-cases', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapList(response);
  },
  get: (token: string, testCaseId: string) =>
    apiRequest<ManagedTestCase>(`/test-cases/${testCaseId}`, { token }),
  create: (token: string, payload: CreateTestCasePayload) =>
    apiRequest<ManagedTestCase>('/test-cases', {
      method: 'POST',
      token,
      body: payload,
    }),
  update: (token: string, testCaseId: string, payload: UpdateTestCasePayload) =>
    apiRequest<ManagedTestCase>(`/test-cases/${testCaseId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),
  replaceSteps: (token: string, testCaseId: string, payload: ReplaceTestStepsPayload) =>
    apiRequest<ManagedTestCase>(`/test-cases/${testCaseId}/steps`, {
      method: 'PUT',
      token,
      body: payload,
    }),
  remove: (token: string, testCaseId: string) =>
    apiRequest<void>(`/test-cases/${testCaseId}`, {
      method: 'DELETE',
      token,
    }),
};

export const testRunsApi = {
  listPage: async (
    token: string,
    params: { projectId?: string; testPlanId?: string; search?: string; status?: string; limit?: number } = {},
  ) => {
    const response = await apiRequest<TestRun[] | PaginatedResponse<TestRun>>(
      withQuery('/test-runs', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapPage(response);
  },
  list: async (
    token: string,
    params: { projectId?: string; testPlanId?: string; search?: string; status?: string; limit?: number } = {},
  ) => {
    const response = await apiRequest<TestRun[] | PaginatedResponse<TestRun>>(
      withQuery('/test-runs', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapList(response);
  },
  get: (token: string, testRunId: string) =>
    apiRequest<TestRun>(`/test-runs/${testRunId}`, { token }),
  assign: (token: string, testRunId: string, assignedToId: string) =>
    apiRequest<TestRun>(`/test-runs/${testRunId}/assign`, {
      method: 'POST',
      token,
      body: { assignedToId },
    }),
  execute: (token: string, testRunId: string, payload: ExecuteTestResultPayload) =>
    apiRequest<TestResult>(`/test-runs/${testRunId}/execute`, {
      method: 'POST',
      token,
      body: payload,
    }),
  rerunFailed: (token: string, testRunId: string, payload: { name?: string; description?: string }) =>
    apiRequest<{ testRun: TestRun | null; failedCount: number }>(`/test-runs/${testRunId}/rerun-failed`, {
      method: 'POST',
      token,
      body: payload,
    }),
  remove: (token: string, testRunId: string) =>
    apiRequest<void>(`/test-runs/${testRunId}`, {
      method: 'DELETE',
      token,
    }),
};

export const testResultsApi = {
  listPage: async (
    token: string,
    params: { testRunId?: string; testCaseId?: string; status?: string; limit?: number } = {},
  ) => {
    const response = await apiRequest<TestResult[] | PaginatedResponse<TestResult>>(
      withQuery('/test-results', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapPage(response);
  },
  list: async (
    token: string,
    params: { testRunId?: string; testCaseId?: string; status?: string; limit?: number } = {},
  ) => {
    const response = await apiRequest<TestResult[] | PaginatedResponse<TestResult>>(
      withQuery('/test-results', { ...params, limit: params.limit ?? 100 }),
      {
        token,
      },
    );

    return unwrapList(response);
  },
  create: (token: string, payload: CreateTestResultPayload) =>
    apiRequest<TestResult>('/test-results', {
      method: 'POST',
      token,
      body: payload,
    }),
  update: (token: string, resultId: string, payload: Partial<ExecuteTestResultPayload>) =>
  apiRequest<TestResult>(`/test-results/${resultId}`, {
    method: 'PATCH',
    token,
    body: payload,
  }),

  rerunFailed: (token: string, testRunId: string, payload: Record<string, never>) =>
    apiRequest<{ testRun: TestRun; failedCount: number }>(`/test-runs/${testRunId}/rerun-failed`,{
      method: 'POST',
      token,
      body: payload,
    },
  ),
};

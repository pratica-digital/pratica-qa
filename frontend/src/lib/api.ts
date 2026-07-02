import type {
  AuthUser,
  CreateUserPayload,
  DashboardAnalytics,
  DashboardPeriod,
  CreateProjectPayload,
  CreateTestCasePayload,
  CreateTestPlanPayload,
  CreateTestResultPayload,
  CreateTestRunPayload,
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
  AiExtractedRelease,
  AiGeneratedTestCase,
  AiGenerationRecord,
  AiHistoryItem,
  AiReleaseAnalysis,
  AiSettings,
  UserEmailNotificationResponse,
  UpdateTestCasePayload,
  UpdateTestPlanPayload,
  UpdateProjectPayload,
  UpdateTestResultPayload,
  UpdateTestSuitePayload,
  UpdateUserPayload,
} from '../types/testRun';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_URL is required');
  }

  return API_BASE_URL;
}

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

  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
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

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers();
  const body = options.body;
  const formDataBody = isFormData(body);
  let requestBody: BodyInit | undefined;

  if (body !== undefined && !formDataBody) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  if (formDataBody) {
    requestBody = body;
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body: requestBody,
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

export function resolveApiAssetUrl(value?: string | null) {
  if (!value) {
    return '';
  }

  if (/^(https?:|data:|blob:)/.test(value)) {
    return value;
  }

  const apiOrigin = new URL(getApiBaseUrl(), window.location.origin).origin;
  return `${apiOrigin}${value.startsWith('/') ? value : `/${value}`}`;
}

function projectPayloadToFormData(payload: CreateProjectPayload | UpdateProjectPayload) {
  const formData = new FormData();

  if ('name' in payload && payload.name !== undefined) {
    formData.set('name', payload.name);
  }

  if ('key' in payload && payload.key !== undefined) {
    formData.set('key', payload.key);
  }

  if ('description' in payload && payload.description !== undefined) {
    formData.set('description', payload.description);
  }

  if ('status' in payload && payload.status !== undefined) {
    formData.set('status', payload.status);
  }

  if ('category' in payload && payload.category !== undefined) {
    formData.set('category', payload.category);
  }

  if ('removeImage' in payload && payload.removeImage !== undefined) {
    formData.set('removeImage', String(payload.removeImage));
  }

  if ('imageFile' in payload && payload.imageFile) {
    formData.set('image', payload.imageFile);
  }

  return formData;
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
    apiRequest<UserEmailNotificationResponse>('/users', {
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
    apiRequest<UserEmailNotificationResponse>(`/users/${userId}/reset-password`, {
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
      body: projectPayloadToFormData(payload),
    }),
  update: (token: string, projectId: string, payload: UpdateProjectPayload) =>
    apiRequest<ProjectSummary>(`/projects/${projectId}`, {
      method: 'PATCH',
      token,
      body: projectPayloadToFormData(payload),
    }),
  remove: (token: string, projectId: string) =>
    apiRequest<void>(`/projects/${projectId}`, {
      method: 'DELETE',
      token,
    }),
};

export const reportsApi = {
  dashboardAnalytics: (token: string, period: DashboardPeriod = '12m') =>
    apiRequest<DashboardAnalytics>(withQuery('/reports/dashboard-analytics', { period }), {
      token,
    }),
};

export const testSuitesApi = {
  listPage: async (
    token: string,
    params: { projectId?: string; search?: string; limit?: number } = {},
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
    params: { projectId?: string; search?: string; limit?: number } = {},
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
  create: (token: string, payload: CreateTestRunPayload) =>
    apiRequest<TestRun>('/test-runs', {
      method: 'POST',
      token,
      body: payload,
    }),
  assignableUsers: (token: string) => apiRequest<AuthUser[]>('/test-runs/assignable-users', { token }),
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
  update: (token: string, resultId: string, payload: UpdateTestResultPayload) =>
    apiRequest<TestResult>(`/test-results/${resultId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),
  uploadAttachments: (token: string, resultId: string, files: File[], testStepId?: string) => {
    const formData = new FormData();

    files.forEach((file) => formData.append('attachments', file));
    if (testStepId) {
      formData.set('testStepId', testStepId);
    }

    return apiRequest<TestResult>(`/test-results/${resultId}/attachments`, {
      method: 'POST',
      token,
      body: formData,
    });
  },
  removeAttachment: (token: string, resultId: string, attachmentId: string) =>
    apiRequest<TestResult>(`/test-results/${resultId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      token,
    }),
  remove: (token: string, resultId: string) =>
    apiRequest<TestResult>(`/test-results/${resultId}`, {
      method: 'DELETE',
      token,
    }),

  rerunFailed: (token: string, testRunId: string, payload: Record<string, never>) =>
    apiRequest<{ testRun: TestRun; failedCount: number }>(`/test-runs/${testRunId}/rerun-failed`,{
      method: 'POST',
      token,
      body: payload,
    },
  ),
};

export const aiTestGeneratorApi = {
  extract: (token: string, file: File) => {
    const formData = new FormData();
    formData.set('file', file);

    return apiRequest<AiExtractedRelease>('/ai-test-generator/extract', {
      method: 'POST',
      token,
      body: formData,
    });
  },
  analyze: (token: string, payload: { releaseNotes: string; releaseTitle?: string; fileName?: string }) =>
    apiRequest<{
      releaseHash: string;
      provider: string;
      model: string;
      analysis: AiReleaseAnalysis;
    }>('/ai-test-generator/analyze', {
      method: 'POST',
      token,
      body: payload,
    }),
  generate: (
    token: string,
    payload: {
      releaseNotes: string;
      releaseTitle?: string;
      fileName?: string;
      useCache?: boolean;
      analysis?: AiReleaseAnalysis;
    },
  ) =>
    apiRequest<AiGenerationRecord>('/ai-test-generator/generate', {
      method: 'POST',
      token,
      body: payload,
    }),
  runAction: (
    token: string,
    payload: {
      action: 'improve' | 'negative-cases' | 'regression' | 'test-data' | 'explain-change';
      testCase: AiGeneratedTestCase;
      context?: string;
    },
  ) =>
    apiRequest<unknown>('/ai-test-generator/actions', {
      method: 'POST',
      token,
      body: payload,
    }),
  saveCases: (
    token: string,
    payload: {
      suiteId: string;
      generationId?: string;
      cases: AiGeneratedTestCase[];
      selectedCaseIds?: string[];
    },
  ) =>
    apiRequest<{ count: number; created: ManagedTestCase[] }>('/ai-test-generator/save', {
      method: 'POST',
      token,
      body: payload,
    }),
  history: (token: string, params: { page?: number; limit?: number } = {}) =>
    apiRequest<PaginatedResponse<AiHistoryItem>>(
      withQuery('/ai-test-generator/history', { page: params.page, limit: params.limit ?? 50 }),
      { token },
    ),
  getHistory: (token: string, id: string) =>
    apiRequest<AiGenerationRecord>(`/ai-test-generator/history/${id}`, { token }),
  regenerate: (token: string, id: string) =>
    apiRequest<AiGenerationRecord>(`/ai-test-generator/history/${id}/regenerate`, {
      method: 'POST',
      token,
    }),
  getSettings: (token: string) => apiRequest<AiSettings>('/ai-test-generator/settings', { token }),
  updateSettings: (token: string, payload: AiSettings) =>
    apiRequest<AiSettings>('/ai-test-generator/settings', {
      method: 'PUT',
      token,
      body: payload,
    }),
};

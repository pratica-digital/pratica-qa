import type {
  AuthUser,
  ExecuteTestResultPayload,
  PaginatedResponse,
  TestResult,
  TestRun,
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

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  me: (token: string) => apiRequest<AuthUser>('/users/me', { token }),
};

export const usersApi = {
  list: async (token: string) => {
    const response = await apiRequest<AuthUser[] | PaginatedResponse<AuthUser>>('/users?limit=100', {
      token,
    });

    return unwrapList(response);
  },
};

export const testRunsApi = {
  list: async (token: string) => {
    const response = await apiRequest<TestRun[] | PaginatedResponse<TestRun>>('/test-runs?limit=100', {
      token,
    });

    return unwrapList(response);
  },
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
};

export const testResultsApi = {
  create: (
    token: string,
    payload: ExecuteTestResultPayload & {
      testRunId: string;
      testCaseId: string;
      executedById?: string;
    },
  ) =>
    apiRequest<TestResult>('/test-results', {
      method: 'POST',
      token,
      body: payload,
    }),
};

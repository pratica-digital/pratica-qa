// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/useAuth';
import { testRunsApi } from '../lib/api';
import type { AuthUser, TestRun, UserRole } from '../types/testRun';
import { TestRunsPage } from './TestRunsPage';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  testRunsApi: {
    assignableUsers: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('./Newtestrunmodal', () => ({ NewTestRunModal: () => null }));

const qaUser: AuthUser = {
  id: 'qa-id',
  email: 'qa@example.com',
  name: 'QA User',
  role: 'QA',
  status: 'ACTIVE',
};
const run: TestRun = {
  id: 'run-id',
  assignedToId: qaUser.id,
  assignedTo: qaUser,
  name: 'Nome atual do Test Run',
  status: 'PENDING',
  suites: [],
  results: [],
  updatedAt: '2026-07-22T10:00:00Z',
};

function authenticate(role: UserRole) {
  const user = { ...qaUser, id: role === 'VIEWER' ? qaUser.id : `${role.toLowerCase()}-id`, role };
  vi.mocked(useAuth).mockReturnValue({
    assignedTestRuns: [],
    changePassword: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setAssignedTestRuns: vi.fn(),
    token: 'token',
    updateProfile: vi.fn(),
    user,
  });
}

async function renderPage(role: UserRole = 'ADMIN') {
  authenticate(role);
  vi.mocked(testRunsApi.list).mockResolvedValue([run]);
  vi.mocked(testRunsApi.assignableUsers).mockResolvedValue([qaUser]);
  render(<TestRunsPage onOpenRun={vi.fn()} />);
  await screen.findByText(run.name);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TestRunsPage name editing', () => {
  it('shows edit name while preserving edit types and delete actions', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Ações da execução' }));

    expect(screen.getByRole('menuitem', { name: 'Editar nome' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Editar tipos' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toBeTruthy();
  });

  it('opens the modal and updates the displayed name immediately after saving', async () => {
    const updatedRun = { ...run, name: 'Nome atualizado na lista' };
    vi.mocked(testRunsApi.update).mockResolvedValue(updatedRun);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Ações da execução' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar nome' }));
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveProperty('value', run.name);

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), {
      target: { value: updatedRun.name },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText(updatedRun.name)).toBeTruthy();
    expect(screen.queryByText(run.name)).toBeNull();
    expect(screen.getByText('Nome do Test Run atualizado com sucesso.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('hides the action menu, including edit name, from users without permission', async () => {
    await renderPage('VIEWER');

    expect(screen.queryByRole('button', { name: 'Ações da execução' })).toBeNull();
    expect(screen.queryByText('Editar nome')).toBeNull();
    await waitFor(() => expect(testRunsApi.assignableUsers).not.toHaveBeenCalled());
  });
});

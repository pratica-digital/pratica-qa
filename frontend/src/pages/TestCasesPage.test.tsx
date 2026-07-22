// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/useAuth';
import { testCasesApi, testSuitesApi } from '../lib/api';
import { getCaseHierarchy } from '../lib/testCaseHierarchy';
import type { ManagedTestCase, ManagedTestSuite } from '../types/testRun';
import { TestCasesPage } from './TestCasesPage';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  testCasesApi: {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
    replaceSteps: vi.fn(),
    update: vi.fn(),
  },
  testSuitesApi: { list: vi.fn() },
}));
vi.mock('./Newtestcasemodal', () => ({ NewTestCaseModal: () => null }));
vi.mock('../components/test-cases/TestCaseEditPanel', () => ({ TestCaseEditPanel: () => null }));

const testCase: ManagedTestCase = {
  id: 'case-id',
  suiteId: 'suite-id',
  title: 'Forno Combinado - Vapor Combinado: Acesso',
  position: 1,
  description: '',
  expectedResult: '',
  section: 'Forno Combinado - Vapor Combinado',
  status: 'ACTIVE',
  tags: ['regressão'],
  steps: [{ id: 'step-id', order: 1, description: 'Abrir receita' }],
};

const suite: ManagedTestSuite = {
  id: 'suite-id',
  name: 'Execução de Receitas',
  position: 1,
  projects: [{ id: 'project-id', key: 'TSI', name: 'Forno Combinado' }],
};

async function renderPage(cases = [testCase], suites = [suite]) {
  vi.mocked(useAuth).mockReturnValue({
    token: 'token',
    user: { role: 'ADMIN' },
  } as ReturnType<typeof useAuth>);
  vi.mocked(testCasesApi.list).mockResolvedValue(cases);
  vi.mocked(testSuitesApi.list).mockResolvedValue(suites);
  render(<TestCasesPage />);
  await screen.findByText(testCase.title);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TestCasesPage table', () => {
  it('shows only the case and hierarchy labels, keeping the final header visually unnamed', async () => {
    await renderPage();

    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(3);
    expect(headers[0].textContent).toBe('Caso');
    expect(headers[1].textContent).toBe('Projeto / Suíte');
    expect(headers[2].textContent).toBe('Menu');
    expect(screen.queryByRole('columnheader', { name: 'Status' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Passos' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Ações' })).toBeNull();
  });

  it('renders project, suite and section in order and preserves the existing row menu', async () => {
    await renderPage();

    const row = screen.getByRole('row', { name: /Forno Combinado - Vapor Combinado: Acesso/ });
    expect(row.textContent).toContain('Forno CombinadoExecução de ReceitasForno Combinado - Vapor Combinado');
    expect(within(row).getByRole('button', { name: 'Test case actions' })).toBeTruthy();
    expect(row.textContent).not.toContain('regressão');
  });

  it('removes invalid hierarchy labels and handles a missing hierarchy', async () => {
    const missingHierarchyCase = { ...testCase, suiteId: 'missing', section: ' undefined ' };
    await renderPage([missingHierarchyCase], [{ ...suite, name: 'Untitled', projects: [] }]);

    expect(screen.queryByText('Untitled')).toBeNull();
    expect(screen.queryByText('undefined')).toBeNull();
    expect(screen.getByText('Sem suíte definida')).toBeTruthy();
  });

  it('normalizes incomplete paths without empty separators', () => {
    expect(getCaseHierarchy({ ...testCase, section: 'Untitled' }, [suite])).toEqual([
      'Forno Combinado',
      'Execução de Receitas',
    ]);
  });
});

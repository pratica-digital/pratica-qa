import { ChevronRight, Filter, Plus, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { ActionMenu } from '../components/ActionMenu';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { TestCaseEditPanel } from '../components/test-cases/TestCaseEditPanel';
import { ApiError, testCasesApi, testSuitesApi } from '../lib/api';
import { getCaseHierarchy, getCaseProjectName } from '../lib/testCaseHierarchy';
import type {
  CreateTestCasePayload,
  ManagedTestCase,
  ManagedTestSuite,
  ReplaceTestStepsPayload,
  UpdateTestCasePayload,
} from '../types/testRun';
import { NewTestCaseModal } from './Newtestcasemodal';

type TestCasesPageProps = {
  createActionEventId?: number;
};

function getProjectName(testCase: ManagedTestCase, suites: ManagedTestSuite[]) {
  return getCaseProjectName(testCase, suites);
}

export function TestCasesPage({ createActionEventId = 0 }: TestCasesPageProps) {
  const { token, user } = useAuth();
  const isReadOnly = user?.role === 'VIEWER';
  const canEdit = Boolean(token && user && user.role !== 'VIEWER');

  const [cases, setCases] = useState<ManagedTestCase[]>([]);
  const [suites, setSuites] = useState<ManagedTestSuite[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<ManagedTestCase | null>(null);
  const [casePendingDelete, setCasePendingDelete] = useState<ManagedTestCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [nextCases, nextSuites] = await Promise.all([
        testCasesApi.list(token),
        testSuitesApi.list(token),
      ]);

      setCases(nextCases);
      setSuites(nextSuites);
    } catch (fetchError) {
      if (fetchError instanceof ApiError && fetchError.status === 401) {
        setError('Sua sessão expirou. Saia e entre novamente.');
      } else {
        setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível carregar os casos de teste.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchData]);

  useEffect(() => {
    if (createActionEventId > 0 && !isReadOnly) {
      const timeoutId = window.setTimeout(() => setModalOpen(true), 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [createActionEventId, isReadOnly]);

  const visibleCases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return cases;
    }

    return cases.filter((testCase) => {
      const searchable = [
        testCase.id,
        testCase.title,
        testCase.description,
        testCase.expectedResult,
        testCase.section,
        getProjectName(testCase, suites),
        ...getCaseHierarchy(testCase, suites),
        ...(testCase.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [cases, search, suites]);

  async function handleCreate(payload: CreateTestCasePayload) {
    if (!token) {
      return;
    }

    const createdCase = await testCasesApi.create(token, payload);
    setCases((current) => [createdCase, ...current]);
    setSuccess('Test case created.');
  }

  async function handleOpenCase(testCase: ManagedTestCase) {
    if (!token) {
      setEditingCase(testCase);
      return;
    }

    try {
      const freshCase = await testCasesApi.get(token, testCase.id);
      setEditingCase(freshCase);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Não foi possível carregar o caso de teste.');
    }
  }

  async function handleSaveCase(
    testCase: ManagedTestCase,
    payload: UpdateTestCasePayload,
    steps: ReplaceTestStepsPayload,
  ) {
    if (!token) {
      throw new Error('Autenticação obrigatória.');
    }

    await testCasesApi.update(token, testCase.id, payload);
    const updatedCase = await testCasesApi.replaceSteps(token, testCase.id, steps);

    setCases((current) =>
      current.map((item) => (item.id === testCase.id ? updatedCase : item)),
    );
    setEditingCase(updatedCase);
    setSuccess('Test case updated.');
  }

  function requestCaseDelete(testCase: ManagedTestCase) {
    setError('');
    setSuccess('');
    setCasePendingDelete(testCase);
  }

  async function handleDeleteCase() {
    if (!token || !casePendingDelete) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await testCasesApi.remove(token, casePendingDelete.id);
      setCases((current) => current.filter((testCase) => testCase.id !== casePendingDelete.id));

      if (editingCase?.id === casePendingDelete.id) {
        setEditingCase(null);
      }

      setCasePendingDelete(null);
      setSuccess('Test case deleted.');
    } catch (deleteError) {
      setCasePendingDelete(null);
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o caso de teste.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Biblioteca de casos</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Casos de Teste
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => void fetchData()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit}
            onClick={() => setModalOpen(true)}
            title={isReadOnly ? 'Modo visualizador é somente leitura' : 'Criar caso de teste'}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Caso de teste
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:max-w-md">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar casos de teste"
            type="search"
            value={search}
          />
        </label>
        <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600">
          <Filter className="h-4 w-4" aria-hidden="true" />
          {visibleCases.length} exibido{visibleCases.length === 1 ? '' : 's'}
        </span>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Carregando casos de teste
        </div>
      ) : visibleCases.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-950">Tabela de casos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] table-fixed text-left text-sm">
                <thead className="bg-slate-100 text-xs font-medium uppercase text-slate-700">
                  <tr>
                    <th className="w-[46%] px-4 py-3">Caso</th>
                    <th className="w-[46%] px-4 py-3">Projeto / Suíte</th>
                    <th className="w-16 px-4 py-3 text-right">
                      <span className="sr-only">Menu</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleCases.map((testCase) => {
                    const hierarchy = getCaseHierarchy(testCase, suites);
                    const projectName = getProjectName(testCase, suites);

                    return (
                      <tr
                        className="cursor-pointer hover:bg-slate-50"
                        key={testCase.id}
                        onClick={() => void handleOpenCase(testCase)}
                      >
                        <td className="px-4 py-3 align-top">
                          <p
                            className="line-clamp-2 break-words font-medium text-slate-950"
                            title={testCase.title}
                          >
                            {testCase.title}
                          </p>
                          {projectName ? (
                            <p
                              className="mt-1 truncate text-xs text-slate-500"
                              title={projectName}
                            >
                              {projectName}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600">
                          <div
                            className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5"
                            title={hierarchy.join(' > ') || 'Sem suíte definida'}
                          >
                            {hierarchy.length > 0 ? (
                              hierarchy.map((label, index) => (
                                <span className="inline-flex min-w-0 items-center gap-1" key={`${label}-${index}`}>
                                  {index > 0 ? (
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                                  ) : null}
                                  <span className={index === 0 ? 'break-words font-medium text-slate-700' : 'break-words text-xs text-slate-500'}>
                                    {label}
                                  </span>
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">Sem suíte definida</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <ActionMenu
                            ariaLabel="Test case actions"
                            disabled={!canEdit}
                            items={[
                              {
                                label: 'Editar',
                                onSelect: () => void handleOpenCase(testCase),
                                title: 'Editar caso de teste',
                              },
                              {
                                label: 'Excluir',
                                onSelect: () => requestCaseDelete(testCase),
                                title: 'Excluir caso de teste',
                                tone: 'danger',
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Nenhum caso de teste encontrado</h2>
          <p className="mt-1 text-sm text-slate-500">
            Adjust the search or create the first case.
          </p>
        </div>
      )}

      <NewTestCaseModal
        onClose={() => setModalOpen(false)}
        onCreateFromApi={handleCreate}
        open={modalOpen}
        suites={suites}
      />

      {editingCase ? (
        <TestCaseEditPanel
          key={editingCase.id}
          onClose={() => setEditingCase(null)}
          onDelete={canEdit ? requestCaseDelete : undefined}
          onSave={handleSaveCase}
          readOnly={!canEdit}
          suites={suites}
          testCase={editingCase}
        />
      ) : null}

      {casePendingDelete ? (
        <DeleteConfirmationModal
          description="This will remove the test case from the case library and from its suite."
          loading={isDeleting}
          onCancel={() => setCasePendingDelete(null)}
          onConfirm={() => void handleDeleteCase()}
          title="Excluir caso de teste?"
        />
      ) : null}
    </div>
  );
}

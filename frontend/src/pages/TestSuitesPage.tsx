import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Filter, Plus, RefreshCw, Search } from 'lucide-react';
import { canManageTests } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { ActionMenu } from '../components/ActionMenu';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { TestCaseEditPanel } from '../components/test-cases/TestCaseEditPanel';
import { TestCaseImportModal } from '../components/test-suites/TestCaseImportModal';
import { TestSuiteDetailPanel } from '../components/test-suites/TestSuiteDetailPanel';
import { TestSuiteEditPanel } from '../components/test-suites/TestSuiteEditPanel';
import { ApiError, projectsApi, testCasesApi, testSuitesApi } from '../lib/api';
import type {
  CreateTestSuitePayload,
  ImportTestCasesPayload,
  ImportTestCasesReport,
  ManagedTestCase,
  ManagedTestSuite,
  ProjectSummary,
  ReplaceTestStepsPayload,
  UpdateTestCasePayload,
  UpdateTestSuitePayload,
} from '../types/testRun';
import { NewSuiteModal } from './NewSuiteModal';

type TestSuitesPageProps = {
  createActionEventId?: number;
};

const CASE_ORDER_STORAGE_KEY = 'qa-platform-suite-case-order';

type CaseOrderBySuite = Record<string, string[]>;

function readCaseOrder() {
  try {
    const stored = window.localStorage.getItem(CASE_ORDER_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CaseOrderBySuite) : {};
  } catch {
    return {};
  }
}

function writeCaseOrder(caseOrder: CaseOrderBySuite) {
  window.localStorage.setItem(CASE_ORDER_STORAGE_KEY, JSON.stringify(caseOrder));
}

function getSuiteCases(
  suite: ManagedTestSuite,
  cases: ManagedTestCase[],
  caseOrder: CaseOrderBySuite,
) {
  const suiteCases = cases.filter((testCase) => testCase.suiteId === suite.id);
  const orderedIds = caseOrder[suite.id] ?? [];

  return [...suiteCases].sort((left, right) => {
    const leftIndex = orderedIds.indexOf(left.id);
    const rightIndex = orderedIds.indexOf(right.id);

    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) {
        return 1;
      }

      if (rightIndex === -1) {
        return -1;
      }

      return leftIndex - rightIndex;
    }

    const sectionCompare = (left.section ?? '').localeCompare(right.section ?? '');

    if (sectionCompare !== 0) {
      return sectionCompare;
    }

    return left.title.localeCompare(right.title);
  });
}

function getUpdatedAt(suite: ManagedTestSuite) {
  if (!suite.updatedAt) {
    return 'Sem atualizações';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(suite.updatedAt));
}

export function TestSuitesPage({ createActionEventId = 0 }: TestSuitesPageProps) {
  const { token, user } = useAuth();
  const isReadOnly = user?.role === 'VIEWER';
  const canManageTestAssets = canManageTests(user);

  const [suites, setSuites] = useState<ManagedTestSuite[]>([]);
  const [cases, setCases] = useState<ManagedTestCase[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [caseOrder, setCaseOrder] = useState<CaseOrderBySuite>(() => readCaseOrder());
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<ManagedTestSuite | null>(null);
  const [selectedCase, setSelectedCase] = useState<ManagedTestCase | null>(null);
  const [editingSuite, setEditingSuite] = useState<ManagedTestSuite | null>(null);
  const [importingSuite, setImportingSuite] = useState<ManagedTestSuite | null>(null);
  const [suitePendingDelete, setSuitePendingDelete] = useState<ManagedTestSuite | null>(null);
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
      const [nextSuites, nextCases, nextProjects] = await Promise.all([
        testSuitesApi.list(token),
        testCasesApi.list(token),
        projectsApi.list(token),
      ]);

      setSuites(nextSuites);
      setCases(nextCases);
      setProjects(nextProjects);
    } catch (fetchError) {
      if (fetchError instanceof ApiError && fetchError.status === 401) {
        setError('Sua sessão expirou. Saia e entre novamente.');
      } else {
        setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível carregar as suítes de teste.');
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
    if (createActionEventId > 0 && canManageTestAssets) {
      const timeoutId = window.setTimeout(() => setModalOpen(true), 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [canManageTestAssets, createActionEventId]);

  const visibleSuites = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return suites;
    }

    return suites.filter((suite) => {
      const searchable = [
        suite.name,
        suite.project?.name,
        suite.project?.key,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [search, suites]);

  async function handleCreate(payload: CreateTestSuitePayload) {
    if (!token) {
      return;
    }

    const createdSuite = await testSuitesApi.create(token, payload);
    setSuites((current) => [createdSuite, ...current]);
    setSuccess('Suíte de teste criada.');
  }

  async function handleSaveSuite(
    suite: ManagedTestSuite,
    payload: UpdateTestSuitePayload,
    orderedCaseIds: string[],
  ) {
    if (!token) {
      throw new Error('Autenticação obrigatória.');
    }

    const updatedSuite = await testSuitesApi.update(token, suite.id, payload);
    const nextOrder = {
      ...caseOrder,
      [suite.id]: orderedCaseIds,
    };

    setSuites((current) =>
      current.map((item) => (item.id === suite.id ? { ...item, ...updatedSuite } : item)),
    );
    setCaseOrder(nextOrder);
    writeCaseOrder(nextOrder);
    setEditingSuite({ ...suite, ...updatedSuite });
    setSuccess('Suíte de teste atualizada.');
  }

  async function handleOpenSuite(suite: ManagedTestSuite) {
    if (!token) {
      setSelectedSuite(suite);
      return;
    }

    try {
      const freshSuite = await testSuitesApi.get(token, suite.id);
      setSelectedSuite(freshSuite);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Não foi possível carregar a suíte de teste.');
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
    setSelectedCase(updatedCase);
    setSuccess('Test case updated.');
  }

  async function handleImportCases(payload: ImportTestCasesPayload): Promise<ImportTestCasesReport> {
    if (!token || !importingSuite) {
      throw new Error('Autenticação obrigatória.');
    }

    const report = await testSuitesApi.importCases(token, importingSuite.id, payload);
    const [nextSuites, nextCases] = await Promise.all([
      testSuitesApi.list(token),
      testCasesApi.list(token),
    ]);
    const refreshedSuite = nextSuites.find((suite) => suite.id === importingSuite.id);

    setSuites(nextSuites);
    setCases(nextCases);

    if (refreshedSuite && selectedSuite?.id === refreshedSuite.id) {
      setSelectedSuite(refreshedSuite);
    }

    if (refreshedSuite && editingSuite?.id === refreshedSuite.id) {
      setEditingSuite(refreshedSuite);
    }

    setSuccess(`${report.imported} casos de teste importados.`);
    return report;
  }

  function requestSuiteDelete(suite: ManagedTestSuite) {
    setError('');
    setSuccess('');
    setSuitePendingDelete(suite);
  }

  function requestCaseDelete(testCase: ManagedTestCase) {
    setError('');
    setSuccess('');
    setCasePendingDelete(testCase);
  }

  const editingSuiteCases = editingSuite
    ? getSuiteCases(editingSuite, cases, caseOrder)
    : [];
  const selectedSuiteCases = selectedSuite
    ? getSuiteCases(selectedSuite, cases, caseOrder)
    : [];

  async function handleDeleteSuite() {
    if (!token || !suitePendingDelete) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await testSuitesApi.remove(token, suitePendingDelete.id);
      setSuites((current) => current.filter((suite) => suite.id !== suitePendingDelete.id));
      setCases((current) => current.filter((testCase) => testCase.suiteId !== suitePendingDelete.id));

      const nextOrder = { ...caseOrder };
      delete nextOrder[suitePendingDelete.id];
      setCaseOrder(nextOrder);
      writeCaseOrder(nextOrder);

      if (selectedSuite?.id === suitePendingDelete.id) {
        setSelectedSuite(null);
      }

      if (editingSuite?.id === suitePendingDelete.id) {
        setEditingSuite(null);
      }

      setSuitePendingDelete(null);
      setSuccess('Suíte de teste excluída.');
    } catch (deleteError) {
      setSuitePendingDelete(null);
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir a suíte de teste.');
    } finally {
      setIsDeleting(false);
    }
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

      const nextOrder = Object.fromEntries(
        Object.entries(caseOrder).map(([suiteId, caseIds]) => [
          suiteId,
          caseIds.filter((caseId) => caseId !== casePendingDelete.id),
        ]),
      );

      setCaseOrder(nextOrder);
      writeCaseOrder(nextOrder);

      if (selectedCase?.id === casePendingDelete.id) {
        setSelectedCase(null);
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
          
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Suítes de Teste
          </h1>
          <p className="text-sm font-medium text-slate-500">Conjunto de testes que validam uma funcionalidade específica do sistema</p>
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
            disabled={!canManageTestAssets}
            title={isReadOnly ? 'Modo visualizador é somente leitura' : 'Criar suíte'}
            type="button"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Suíte
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:max-w-md">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar suítes"
            type="search"
            value={search}
          />
        </label>
        <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600">
          <Filter className="h-4 w-4" aria-hidden="true" />
          {visibleSuites.length} exibida{visibleSuites.length === 1 ? '' : 's'}
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
          Carregando suítes de teste
        </div>
      ) : visibleSuites.length > 0 ? (
        <>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-950">Matriz de suítes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-100 text-xs font-medium uppercase text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Suíte</th>
                    <th className="px-4 py-3">Projeto</th>
                    <th className="px-4 py-3">Posição</th>
                    <th className="px-4 py-3">Casos</th>
                    <th className="px-4 py-3">Atualizado</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleSuites.map((suite) => (
                    <tr
                      className="cursor-pointer hover:bg-slate-50"
                      key={suite.id}
                      onClick={() => void handleOpenSuite(suite)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-950">{suite.name}</p>
                        
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {suite.project?.name ?? suite.projectId}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{suite.position}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {getSuiteCases(suite, cases, caseOrder).length}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {getUpdatedAt(suite)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          ariaLabel="Ações da suíte de teste"
                          disabled={!canManageTestAssets}
                          items={[
                            {
                              icon: <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />,
                              label: 'Importar Casos de Teste',
                              onSelect: () => setImportingSuite(suite),
                              title: 'Importar Casos de Teste',
                            },
                            {
                              label: 'Editar',
                              onSelect: () => setEditingSuite(suite),
                              title: 'Editar suíte de teste',
                            },
                            {
                              label: 'Excluir',
                              onSelect: () => requestSuiteDelete(suite),
                              title: 'Excluir suíte de teste',
                              tone: 'danger',
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Nenhuma suíte de teste encontrada</h2>
          <p className="mt-1 text-sm text-slate-500">
            Adjust the search or create the first suite.
          </p>
        </div>
      )}

      <NewSuiteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreateFromApi={handleCreate}
        projects={projects}
      />

      {editingSuite ? (
        <TestSuiteEditPanel
          key={`${editingSuite.id}-${editingSuiteCases.length}`}
          cases={editingSuiteCases}
          onClose={() => setEditingSuite(null)}
          onImportCases={canManageTestAssets ? () => setImportingSuite(editingSuite) : undefined}
          onSave={handleSaveSuite}
          readOnly={!canManageTestAssets}
          suite={editingSuite}
        />
      ) : null}

      {selectedSuite ? (
        <TestSuiteDetailPanel
          cases={selectedSuiteCases}
          onClose={() => setSelectedSuite(null)}
          onDelete={canManageTestAssets ? () => requestSuiteDelete(selectedSuite) : undefined}
          onEdit={() => {
            setEditingSuite(selectedSuite);
            setSelectedSuite(null);
          }}
          onImportCases={canManageTestAssets ? () => setImportingSuite(selectedSuite) : undefined}
          onOpenCase={setSelectedCase}
          suite={selectedSuite}
        />
      ) : null}

      <TestCaseImportModal
        key={importingSuite?.id ?? 'closed-import-modal'}
        onClose={() => setImportingSuite(null)}
        onImport={handleImportCases}
        open={Boolean(importingSuite)}
        suite={importingSuite}
      />

      {selectedCase ? (
        <TestCaseEditPanel
          key={selectedCase.id}
          onClose={() => setSelectedCase(null)}
          onDelete={isReadOnly ? undefined : requestCaseDelete}
          onSave={handleSaveCase}
          readOnly={isReadOnly}
          suites={suites}
          testCase={selectedCase}
        />
      ) : null}

      {suitePendingDelete ? (
        <DeleteConfirmationModal
          description="This will remove the suite and all related test cases from the suite view."
          loading={isDeleting}
          onCancel={() => setSuitePendingDelete(null)}
          onConfirm={() => void handleDeleteSuite()}
          title="Excluir suíte de teste?"
        />
      ) : null}

      {casePendingDelete ? (
        <DeleteConfirmationModal
          description="This will remove the test case from its suite and from future test design workflows."
          loading={isDeleting}
          onCancel={() => setCasePendingDelete(null)}
          onConfirm={() => void handleDeleteCase()}
          title="Excluir caso de teste?"
        />
      ) : null}
    </div>
  );
}

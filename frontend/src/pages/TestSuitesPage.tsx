import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Layers3, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { SuiteStatusBadge } from '../components/badges';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { TestCaseEditPanel } from '../components/test-cases/TestCaseEditPanel';
import { TestSuiteDetailPanel } from '../components/test-suites/TestSuiteDetailPanel';
import { TestSuiteEditPanel } from '../components/test-suites/TestSuiteEditPanel';
import { ApiError, projectsApi, testCasesApi, testSuitesApi } from '../lib/api';
import type {
  CreateTestSuitePayload,
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

    return left.title.localeCompare(right.title);
  });
}

function getUpdatedAt(suite: ManagedTestSuite) {
  if (!suite.updatedAt) {
    return 'No updates';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(suite.updatedAt));
}

export function TestSuitesPage({ createActionEventId = 0 }: TestSuitesPageProps) {
  const { token, user } = useAuth();
  const isReadOnly = user?.role === 'VIEWER';
  const isAdmin = user?.role === 'ADMIN';

  const [suites, setSuites] = useState<ManagedTestSuite[]>([]);
  const [cases, setCases] = useState<ManagedTestCase[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [caseOrder, setCaseOrder] = useState<CaseOrderBySuite>(() => readCaseOrder());
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<ManagedTestSuite | null>(null);
  const [selectedCase, setSelectedCase] = useState<ManagedTestCase | null>(null);
  const [editingSuite, setEditingSuite] = useState<ManagedTestSuite | null>(null);
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
        setError('Your session expired. Sign out and sign in again.');
      } else {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load test suites.');
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
    if (createActionEventId > 0 && isAdmin) {
      const timeoutId = window.setTimeout(() => setModalOpen(true), 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [createActionEventId, isAdmin]);

  const visibleSuites = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return suites;
    }

    return suites.filter((suite) => {
      const searchable = [
        suite.name,
        suite.description,
        suite.project?.name,
        suite.project?.key,
        suite.status,
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
    setSuccess('Test suite created.');
  }

  async function handleSaveSuite(
    suite: ManagedTestSuite,
    payload: UpdateTestSuitePayload,
    orderedCaseIds: string[],
  ) {
    if (!token) {
      throw new Error('Authentication is required.');
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
    setSuccess('Test suite updated.');
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
      setError(openError instanceof Error ? openError.message : 'Unable to load test suite.');
    }
  }

  async function handleSaveCase(
    testCase: ManagedTestCase,
    payload: UpdateTestCasePayload,
    steps: ReplaceTestStepsPayload,
  ) {
    if (!token) {
      throw new Error('Authentication is required.');
    }

    await testCasesApi.update(token, testCase.id, payload);
    const updatedCase = await testCasesApi.replaceSteps(token, testCase.id, steps);

    setCases((current) =>
      current.map((item) => (item.id === testCase.id ? updatedCase : item)),
    );
    setSelectedCase(updatedCase);
    setSuccess('Test case updated.');
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
      setSuccess('Test suite deleted.');
    } catch (deleteError) {
      setSuitePendingDelete(null);
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete test suite.');
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
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete test case.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Test design</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Test Suites
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            disabled={isLoading}
            onClick={() => void fetchData()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            disabled={!isAdmin}
            title={isReadOnly ? 'Viewer mode is read-only' : 'Create suite'}
            type="button"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Suite
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 sm:max-w-md">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search suites"
            type="search"
            value={search}
          />
        </label>
        <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <Filter className="h-4 w-4" aria-hidden="true" />
          {visibleSuites.length} shown
        </span>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Loading test suites
        </div>
      ) : visibleSuites.length > 0 ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visibleSuites.map((suite) => {
              const suiteCases = getSuiteCases(suite, cases, caseOrder);

              return (
                <article
                  className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/60"
                  key={suite.id}
                  onClick={() => void handleOpenSuite(suite)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        <Layers3 className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                          {suite.name}
                        </h2>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {suite.project?.name ?? 'Project'}
                        </p>
                      </div>
                    </div>
                    <SuiteStatusBadge status={suite.status} />
                  </div>
                  <p className="mt-4 line-clamp-2 min-h-10 text-sm text-zinc-600 dark:text-zinc-300">
                    {suite.description || 'No description'}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-zinc-950 dark:text-white">{suiteCases.length}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Cases</p>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-950 dark:text-white">{suite.position}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Position</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      disabled={!isAdmin}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingSuite(suite);
                      }}
                      type="button"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:bg-zinc-950 dark:text-rose-300 dark:hover:bg-rose-950"
                      disabled={!isAdmin}
                      onClick={(event) => {
                        event.stopPropagation();
                        requestSuiteDelete(suite);
                      }}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Suite matrix</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-900/70 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Suite</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Cases</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {visibleSuites.map((suite) => (
                    <tr
                      className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                      key={suite.id}
                      onClick={() => void handleOpenSuite(suite)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-950 dark:text-white">{suite.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{suite.id}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {suite.project?.name ?? suite.projectId}
                      </td>
                      <td className="px-4 py-3">
                        <SuiteStatusBadge status={suite.status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{suite.position}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {getSuiteCases(suite, cases, caseOrder).length}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {getUpdatedAt(suite)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                          disabled={!isAdmin}
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingSuite(suite);
                          }}
                          title="Edit test suite"
                          type="button"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-950 dark:hover:text-rose-300"
                          disabled={!isAdmin}
                          onClick={(event) => {
                            event.stopPropagation();
                            requestSuiteDelete(suite);
                          }}
                          title="Delete test suite"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">No test suites found</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
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
          key={editingSuite.id}
          cases={getSuiteCases(editingSuite, cases, caseOrder)}
          onClose={() => setEditingSuite(null)}
          onSave={handleSaveSuite}
          readOnly={!isAdmin}
          suite={editingSuite}
        />
      ) : null}

      {selectedSuite ? (
        <TestSuiteDetailPanel
          cases={getSuiteCases(selectedSuite, cases, caseOrder)}
          onClose={() => setSelectedSuite(null)}
          onDelete={isAdmin ? () => requestSuiteDelete(selectedSuite) : undefined}
          onEdit={() => {
            setEditingSuite(selectedSuite);
            setSelectedSuite(null);
          }}
          onOpenCase={setSelectedCase}
          suite={selectedSuite}
        />
      ) : null}

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
          title="Delete Test Suite?"
        />
      ) : null}

      {casePendingDelete ? (
        <DeleteConfirmationModal
          description="This will remove the test case from its suite and from future test design workflows."
          loading={isDeleting}
          onCancel={() => setCasePendingDelete(null)}
          onConfirm={() => void handleDeleteCase()}
          title="Delete Test Case?"
        />
      ) : null}
    </div>
  );
}

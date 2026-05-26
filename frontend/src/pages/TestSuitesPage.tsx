import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Layers3, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { SuiteStatusBadge } from '../components/badges';
import { TestSuiteEditPanel } from '../components/test-suites/TestSuiteEditPanel';
import { ApiError, projectsApi, testCasesApi, testSuitesApi } from '../lib/api';
import type {
  CreateTestSuitePayload,
  ManagedTestCase,
  ManagedTestSuite,
  ProjectSummary,
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
  const [editingSuite, setEditingSuite] = useState<ManagedTestSuite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
                  className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                  key={suite.id}
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
                  <button
                    className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    disabled={!isAdmin}
                    onClick={() => setEditingSuite(suite)}
                    type="button"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </button>
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
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60" key={suite.id}>
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
                          onClick={() => setEditingSuite(suite)}
                          title="Edit test suite"
                          type="button"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
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
    </div>
  );
}

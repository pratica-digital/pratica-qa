import { Filter, ListChecks, Pencil, Plus, RefreshCw, Search, Tag } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { CaseStatusBadge, PriorityBadge } from '../components/badges';
import { TestCaseEditPanel } from '../components/test-cases/TestCaseEditPanel';
import { ApiError, testCasesApi, testSuitesApi } from '../lib/api';
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

function getStepCount(testCase: ManagedTestCase) {
  return testCase.steps?.length ?? 0;
}

function getSuiteName(testCase: ManagedTestCase, suites: ManagedTestSuite[]) {
  return (
    suites.find((suite) => suite.id === testCase.suiteId)?.name ??
    testCase.suite?.name ??
    'Unassigned suite'
  );
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
      const [nextCases, nextSuites] = await Promise.all([
        testCasesApi.list(token),
        testSuitesApi.list(token),
      ]);

      setCases(nextCases);
      setSuites(nextSuites);
    } catch (fetchError) {
      if (fetchError instanceof ApiError && fetchError.status === 401) {
        setError('Your session expired. Sign out and sign in again.');
      } else {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load test cases.');
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
        getSuiteName(testCase, suites),
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
    setEditingCase(updatedCase);
    setSuccess('Test case updated.');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Case library</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Test Cases
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
            disabled={!canEdit}
            onClick={() => setModalOpen(true)}
            title={isReadOnly ? 'Viewer mode is read-only' : 'Create test case'}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Test case
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 sm:max-w-md">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search test cases"
            type="search"
            value={search}
          />
        </label>
        <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <Filter className="h-4 w-4" aria-hidden="true" />
          {visibleCases.length} shown
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
          Loading test cases
        </div>
      ) : visibleCases.length > 0 ? (
        <>
          <section className="grid gap-3 md:grid-cols-2">
            {visibleCases.slice(0, 2).map((testCase) => (
              <article
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                key={testCase.id}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <ListChecks className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {testCase.id}
                      </span>
                      <PriorityBadge priority={testCase.priority} />
                      <CaseStatusBadge status={testCase.status} />
                    </div>
                    <h2 className="mt-2 text-sm font-semibold text-zinc-950 dark:text-white">
                      {testCase.title}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {getSuiteName(testCase, suites)} - {getStepCount(testCase)} steps
                    </p>
                  </div>
                  <button
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                    disabled={!canEdit}
                    onClick={() => setEditingCase(testCase)}
                    title="Edit test case"
                    type="button"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </section>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Case table</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-900/70 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Case</th>
                    <th className="px-4 py-3">Suite</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Steps</th>
                    <th className="px-4 py-3">Tags</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {visibleCases.map((testCase) => (
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60" key={testCase.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-950 dark:text-white">{testCase.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{testCase.id}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {getSuiteName(testCase, suites)}
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={testCase.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <CaseStatusBadge status={testCase.status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {getStepCount(testCase)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(testCase.tags ?? []).map((tag) => (
                            <span
                              className="inline-flex h-6 items-center gap-1 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
                              key={tag}
                            >
                              <Tag className="h-3 w-3" aria-hidden="true" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                          disabled={!canEdit}
                          onClick={() => setEditingCase(testCase)}
                          title="Edit test case"
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
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">No test cases found</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
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
          onSave={handleSaveCase}
          readOnly={!canEdit}
          suites={suites}
          testCase={editingCase}
        />
      ) : null}
    </div>
  );
}

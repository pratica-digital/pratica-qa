import { Eye, Filter, Play, Plus, RefreshCw, Search, Trash2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { TestRunStatusBadge, UserRoleBadge } from '../components/badges';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { ApiError, testRunsApi, usersApi } from '../lib/api';
import type { AuthUser, TestRun } from '../types/testRun';
import { NewTestRunModal } from './Newtestrunmodal';

type TestRunsPageProps = {
  onOpenRun: (testRun: TestRun) => void;
  createActionEventId?: number;
};

type RunScope = 'mine' | 'all';

function getResultProgress(testRun: TestRun) {
  const results = testRun.results ?? [];
  const complete = results.filter((result) => result.status !== 'PENDING').length;

  return {
    complete,
    total: results.length,
    percent: results.length === 0 ? 0 : Math.round((complete / results.length) * 100),
  };
}

function getUpdatedAt(testRun: TestRun) {
  if (!testRun.updatedAt) {
    return 'No updates';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(testRun.updatedAt));
}

export function TestRunsPage({ onOpenRun, createActionEventId = 0 }: TestRunsPageProps) {
  const { token, user, setAssignedTestRuns } = useAuth();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [scope, setScope] = useState<RunScope>(() => (user?.role === 'ADMIN' ? 'all' : 'mine'));
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [assigningRunId, setAssigningRunId] = useState<string | null>(null);
  const [openingRunId, setOpeningRunId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [runPendingDelete, setRunPendingDelete] = useState<TestRun | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    if (!token || !user) {
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const [runs, assignableUsers] = await Promise.all([
        testRunsApi.list(token),
        isAdmin ? usersApi.list(token) : Promise.resolve<AuthUser[]>([]),
      ]);

      setTestRuns(runs);
      setAssignedTestRuns(runs.filter((testRun) => testRun.assignedToId === user.id));
      setUsers(assignableUsers.filter((item) => item.status !== 'INACTIVE' && item.role === 'QA'));
    } catch (fetchError) {
      if (fetchError instanceof ApiError && fetchError.status === 401) {
        setError('Your session expired. Sign out and sign in again.');
      } else {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load test runs.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, setAssignedTestRuns, token, user]);

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

  const visibleRuns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const scopedRuns =
      scope === 'all' && isAdmin
        ? testRuns
        : testRuns.filter((testRun) => testRun.assignedToId === user?.id);

    if (!normalizedSearch) {
      return scopedRuns;
    }

    return scopedRuns.filter((testRun) => {
      const searchable = [
        testRun.name,
        testRun.description,
        testRun.project?.name,
        testRun.assignedTo?.name,
        testRun.testPlan?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [isAdmin, scope, search, testRuns, user?.id]);

  const handleAssign = async (testRunId: string, assignedToId: string) => {
    if (!token) {
      return;
    }

    setAssigningRunId(testRunId);
    setError('');
    setSuccess('');

    try {
      const updatedRun = await testRunsApi.assign(token, testRunId, assignedToId);
      const nextRuns = testRuns.map((testRun) => (testRun.id === updatedRun.id ? updatedRun : testRun));

      setTestRuns(nextRuns);
      if (user) {
        setAssignedTestRuns(nextRuns.filter((testRun) => testRun.assignedToId === user.id));
      }
      setSuccess('Test run assignment updated.');
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Unable to assign test run.');
    } finally {
      setAssigningRunId(null);
    }
  };

  const handleCreate = (testRun: TestRun) => {
    const nextRuns = [testRun, ...testRuns];

    setTestRuns(nextRuns);
    setScope('all');
    setSuccess('Test run created.');

    if (user) {
      setAssignedTestRuns(nextRuns.filter((item) => item.assignedToId === user.id));
    }
  };

  const handleOpenRun = async (testRun: TestRun) => {
    if (!token) {
      onOpenRun(testRun);
      return;
    }

    setOpeningRunId(testRun.id);
    setError('');

    try {
      const freshRun = await testRunsApi.get(token, testRun.id);
      onOpenRun(freshRun);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Unable to load test run.');
    } finally {
      setOpeningRunId(null);
    }
  };

  function requestRunDelete(testRun: TestRun) {
    setError('');
    setSuccess('');
    setRunPendingDelete(testRun);
  }

  async function handleDeleteRun() {
    if (!token || !runPendingDelete) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await testRunsApi.remove(token, runPendingDelete.id);
      const nextRuns = testRuns.filter((testRun) => testRun.id !== runPendingDelete.id);

      setTestRuns(nextRuns);
      if (user) {
        setAssignedTestRuns(nextRuns.filter((testRun) => testRun.assignedToId === user.id));
      }

      setRunPendingDelete(null);
      setSuccess('Test run deleted.');
    } catch (deleteError) {
      setRunPendingDelete(null);
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete test run.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Execution queue</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Test Runs
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isAdmin ? (
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              onClick={() => setModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Test run
            </button>
          ) : null}
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            disabled={isLoading}
            onClick={() => void fetchData()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-full rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950 sm:w-auto">
          <button
            className={`h-8 flex-1 rounded-md px-3 text-sm font-medium sm:flex-none ${
              scope === 'mine'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
            }`}
            onClick={() => setScope('mine')}
            type="button"
          >
            My TestRuns
          </button>
          {isAdmin ? (
            <button
              className={`h-8 flex-1 rounded-md px-3 text-sm font-medium sm:flex-none ${
                scope === 'all'
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
              }`}
              onClick={() => setScope('all')}
              type="button"
            >
              All TestRuns
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 sm:w-80">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              className="w-full border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search test runs"
              type="search"
              value={search}
            />
          </label>
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            <Filter className="h-4 w-4" aria-hidden="true" />
            {visibleRuns.length} shown
          </span>
        </div>
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
          Loading test runs
        </div>
      ) : visibleRuns.length > 0 ? (
        <section className="grid gap-3">
          {visibleRuns.map((testRun) => {
            const progress = getResultProgress(testRun);
            const canExecute =
              user?.role === 'ADMIN' || (user?.role === 'QA' && testRun.assignedToId === user.id);

            return (
              <article
                className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/60"
                key={testRun.id}
                onClick={() => void handleOpenRun(testRun)}
                role="button"
                tabIndex={0}
              >
                <div className="grid gap-4 xl:grid-cols-[1fr_16rem_13rem] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <TestRunStatusBadge status={testRun.status} />
                      {testRun.project?.key ? (
                        <span className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                          {testRun.project.key}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-2 truncate text-base font-semibold tracking-normal text-zinc-950 dark:text-white">
                      {testRun.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                      {testRun.description || testRun.testPlan?.name || 'No description'}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Updated {getUpdatedAt(testRun)}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Execution</span>
                      <span>
                        {progress.complete}/{progress.total}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-900">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                          {testRun.assignedTo?.name ?? 'Unassigned'}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {testRun.assignedTo?.email ?? 'No user'}
                        </p>
                      </div>
                      {testRun.assignedTo?.role ? <UserRoleBadge role={testRun.assignedTo.role} /> : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {isAdmin ? (
                      <label
                        className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <UserPlus className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
                        <select
                          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none disabled:cursor-wait dark:text-white"
                          disabled={assigningRunId === testRun.id || users.length === 0}
                          onChange={(event) => void handleAssign(testRun.id, event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          value={testRun.assignedToId}
                        >
                          {users.length === 0 ? (
                            <option value={testRun.assignedToId}>No QA users</option>
                          ) : null}
                          {users.map((assignableUser) => (
                            <option key={assignableUser.id} value={assignableUser.id}>
                              {assignableUser.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      disabled={openingRunId === testRun.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleOpenRun(testRun);
                      }}
                      type="button"
                    >
                      {canExecute ? (
                        <Play className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                      {openingRunId === testRun.id ? 'Opening' : canExecute ? 'Execute' : 'View'}
                    </button>
                    {isAdmin ? (
                      <button
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-zinc-950 dark:text-rose-300 dark:hover:bg-rose-950"
                        onClick={(event) => {
                          event.stopPropagation();
                          requestRunDelete(testRun);
                        }}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">No test runs found</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Adjust the filter or refresh the queue.
          </p>
        </div>
      )}

      <NewTestRunModal
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
        open={modalOpen}
        qaUsers={users}
      />

      {runPendingDelete ? (
        <DeleteConfirmationModal
          description="This will remove the test run and its execution results from the run list."
          loading={isDeleting}
          onCancel={() => setRunPendingDelete(null)}
          onConfirm={() => void handleDeleteRun()}
          title="Delete Test Run?"
        />
      ) : null}
    </div>
  );
}

import { Eye, Filter, Play, Plus, RefreshCw, Search, Trash2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { canManageTests } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { TestRunStatusBadge, UserRoleBadge } from '../components/badges';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { ApiError, testRunsApi } from '../lib/api';
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
  const canManageTestAssets = canManageTests(user);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [scope, setScope] = useState<RunScope>(() => (canManageTests(user) ? 'all' : 'mine'));
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [assigningRunId, setAssigningRunId] = useState<string | null>(null);
  const [openingRunId, setOpeningRunId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [runPendingDelete, setRunPendingDelete] = useState<TestRun | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token || !user) {
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const [runs, assignableUsers] = await Promise.all([
        testRunsApi.list(token),
        canManageTestAssets ? testRunsApi.assignableUsers(token) : Promise.resolve<AuthUser[]>([]),
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
  }, [canManageTestAssets, setAssignedTestRuns, token, user]);

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

  const visibleRuns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const scopedRuns =
      scope === 'all'
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
  }, [scope, search, testRuns, user?.id]);

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
          <p className="text-sm font-medium text-slate-500">Execution queue</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Test Runs
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {canManageTestAssets ? (
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800"
              onClick={() => setModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Test run
            </button>
          ) : null}
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 sm:w-auto">
          <button
            className={`h-8 flex-1 rounded-md px-3 text-sm font-medium sm:flex-none ${
              scope === 'mine'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setScope('mine')}
            type="button"
          >
            My TestRuns
          </button>
          <button
            className={`h-8 flex-1 rounded-md px-3 text-sm font-medium sm:flex-none ${
              scope === 'all'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setScope('all')}
            type="button"
          >
            All TestRuns
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:w-80">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search test runs"
              type="search"
              value={search}
            />
          </label>
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600">
            <Filter className="h-4 w-4" aria-hidden="true" />
            {visibleRuns.length} shown
          </span>
        </div>
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
          Loading test runs
        </div>
      ) : visibleRuns.length > 0 ? (
        <section className="grid gap-3">
          {visibleRuns.map((testRun) => {
            const progress = getResultProgress(testRun);
            const canExecute = canManageTests(user);

            return (
              <article
                className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
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
                        <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500">
                          {testRun.project.key}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-2 truncate text-base font-semibold tracking-normal text-slate-950">
                      {testRun.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {testRun.description || testRun.testPlan?.name || 'No description'}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Updated {getUpdatedAt(testRun)}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Execution</span>
                      <span>
                        {progress.complete}/{progress.total}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-600"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-950">
                          {testRun.assignedTo?.name ?? 'Unassigned'}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {testRun.assignedTo?.email ?? 'No user'}
                        </p>
                      </div>
                      {testRun.assignedTo?.role ? <UserRoleBadge role={testRun.assignedTo.role} /> : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {canManageTestAssets ? (
                      <label
                        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-600"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <UserPlus className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        <select
                          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none disabled:cursor-wait"
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
                      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-white ${
                        canExecute
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-slate-600 hover:bg-slate-700'
                      }`}
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
                    {canManageTestAssets ? (
                      <button
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-600 bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
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
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">No test runs found</h2>
          <p className="mt-1 text-sm text-slate-500">
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

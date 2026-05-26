import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ClipboardCheck,
  Filter,
  RefreshCw,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { TestCaseRunner } from '../components/test-run/TestCaseRunner';
import { TestRunStatusBadge, UserRoleBadge } from '../components/badges';
import { ApiError, testResultsApi, testRunsApi } from '../lib/api';
import type { ExecuteTestResultPayload, TestResult, TestRun } from '../types/testRun';

type TestRunExecutionPageProps = {
  testRun: TestRun;
  onBack: () => void;
  onRunUpdated: (testRun: TestRun) => void;
};

function countResults(results: TestResult[] | undefined, status: TestResult['status']) {
  return results?.filter((result) => result.status === status).length ?? 0;
}

function mergeUpdatedResult(current: TestRun, updatedResult: TestResult) {
  const results = current.results?.map((result) => {
    if (result.id !== updatedResult.id) {
      return result;
    }

    return {
      ...result,
      ...updatedResult,
      testCase: {
        ...result.testCase,
        ...updatedResult.testCase,
        steps: result.testCase.steps,
        description: result.testCase.description,
        expectedResult: result.testCase.expectedResult,
      },
    };
  });

  return {
    ...current,
    status: current.status === 'PENDING' ? 'IN_PROGRESS' : current.status,
    results,
  } satisfies TestRun;
}

function getSuiteId(result: TestResult) {
  return result.testCase.suiteId ?? 'without-suite';
}

function groupResultsBySuite(run: TestRun, results: TestResult[]) {
  const suiteOrder = new Map(
    [...(run.suites ?? [])]
      .sort((left, right) => left.position - right.position)
      .map((suite, index) => [suite.testSuiteId, index]),
  );

  const suiteNames = new Map(
    (run.suites ?? []).map((suite) => [
      suite.testSuiteId,
      suite.testSuite?.name ?? `Suite ${suite.position}`,
    ]),
  );

  const groups = new Map<string, TestResult[]>();

  results.forEach((result) => {
    const suiteId = getSuiteId(result);
    const current = groups.get(suiteId) ?? [];
    groups.set(suiteId, [...current, result]);
  });

  return [...groups.entries()]
    .map(([suiteId, suiteResults]) => ({
      suiteId,
      suiteName: suiteNames.get(suiteId) ?? 'Unassigned suite',
      order: suiteOrder.get(suiteId) ?? Number.MAX_SAFE_INTEGER,
      results: suiteResults,
    }))
    .sort((left, right) => left.order - right.order || left.suiteName.localeCompare(right.suiteName));
}

export function TestRunExecutionPage({
  testRun,
  onBack,
  onRunUpdated,
}: TestRunExecutionPageProps) {
  const { token, user } = useAuth();
  const [run, setRun] = useState(testRun);
  const [submittingResultId, setSubmittingResultId] = useState<string | null>(null);
  const [activeResultId, setActiveResultId] = useState(() => testRun.results?.[0]?.id ?? null);
  const [showFailedOnly, setShowFailedOnly] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const results = useMemo(() => run.results ?? [], [run.results]);
  const failedCount = countResults(results, 'FAILED');
  const visibleResults = useMemo(
    () => (showFailedOnly ? results.filter((result) => result.status === 'FAILED') : results),
    [results, showFailedOnly],
  );
  const effectiveActiveResultId = useMemo(() => {
    if (visibleResults.length === 0) {
      return null;
    }

    return visibleResults.some((result) => result.id === activeResultId)
      ? activeResultId
      : visibleResults[0].id;
  }, [activeResultId, visibleResults]);
  const groupedResults = useMemo(
    () => groupResultsBySuite(run, visibleResults),
    [run, visibleResults],
  );
  const isAssigned = Boolean(user && (run.assignedToId === user.id || run.assignedTo?.id === user.id));
  const canExecute = Boolean(
    user && token && (user.role === 'ADMIN' || (user.role === 'QA' && isAssigned)),
  );

  const disabledReason = useMemo(() => {
    if (!user) {
      return 'Sign in is required to execute this run.';
    }

    if (user.role === 'VIEWER') {
      return 'Viewer mode is read-only.';
    }

    if (user.role === 'ADMIN') {
      return undefined;
    }

    if (user.role !== 'QA') {
      return 'Execution is available to QA users.';
    }

    if (!isAssigned) {
      return 'Only the assigned user can execute this run.';
    }

    return undefined;
  }, [isAssigned, user]);

  const navigateResult = useCallback(
    (direction: -1 | 1) => {
      if (visibleResults.length === 0) {
        return;
      }

      const activeIndex = visibleResults.findIndex((result) => result.id === effectiveActiveResultId);
      const nextIndex =
        activeIndex === -1
          ? 0
          : Math.min(Math.max(activeIndex + direction, 0), visibleResults.length - 1);

      setActiveResultId(visibleResults[nextIndex].id);
    },
    [effectiveActiveResultId, visibleResults],
  );

  const handleSubmit = async (result: TestResult, payload: ExecuteTestResultPayload) => {
    if (!token) {
      return;
    }

    setError('');
    setSuccess('');
    setSubmittingResultId(result.id);

    try {
      const updatedResult = await testResultsApi.update(token, result.id, {
        status: payload.status,
        comment: payload.comment,
        attachments: payload.attachments,
      });
      const nextRun = mergeUpdatedResult(run, updatedResult);

      setRun(nextRun);
      onRunUpdated(nextRun);
      setSuccess(`${result.testCase.title} marked as ${payload.status.toLowerCase()}.`);
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 403) {
        setError('You do not have permission to update this result.');
      } else {
        setError(submitError instanceof Error ? submitError.message : 'Unable to update result.');
      }
    } finally {
      setSubmittingResultId(null);
    }
  };

  const handleRerunFailed = async () => {
    if (!token) {
      return;
    }

    setError('');
    setSuccess('');
    setRerunning(true);

    try {
      const response = await testRunsApi.rerunFailed(token, run.id, {});

      if (!response.testRun || response.failedCount === 0) {
        setSuccess('There are no failed tests to re-run.');
        return;
      }

      setRun(response.testRun);
      onRunUpdated(response.testRun);
      setShowFailedOnly(false);
      setActiveResultId(response.testRun.results?.[0]?.id ?? null);
      setSuccess(`${response.failedCount} failed tests queued for re-execution.`);
    } catch (rerunError) {
      if (rerunError instanceof ApiError && rerunError.status === 403) {
        setError('You do not have permission to re-run failed tests.');
      } else {
        setError(rerunError instanceof Error ? rerunError.message : 'Unable to re-run failed tests.');
      }
    } finally {
      setRerunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {run.project?.name ?? 'Test run'}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
              {run.name}
            </h1>
            {run.description ? (
              <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
                {run.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-80 lg:grid-cols-1">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Assigned
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-zinc-950 dark:text-white">
                {run.assignedTo?.name ?? 'Unassigned'}
              </span>
              {run.assignedTo?.role ? <UserRoleBadge role={run.assignedTo.role} /> : null}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Run status
              </span>
              <TestRunStatusBadge status={run.status} />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">{countResults(results, 'PASSED')}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Pass</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">{countResults(results, 'FAILED')}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Fail</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">{countResults(results, 'SKIPPED')}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Skip</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">{countResults(results, 'PENDING')}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Open</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
              showFailedOnly
                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900'
            }`}
            disabled={failedCount === 0}
            onClick={() => setShowFailedOnly((value) => !value)}
            type="button"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Failed only
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            disabled={!canExecute || failedCount === 0 || rerunning}
            onClick={() => void handleRerunFailed()}
            type="button"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {rerunning ? 'Creating re-run' : 'Re-run failed tests'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {visibleResults.length} tests
          </span>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            disabled={visibleResults.length === 0 || visibleResults[0]?.id === effectiveActiveResultId}
            onClick={() => navigateResult(-1)}
            type="button"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
            Previous
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            disabled={
              visibleResults.length === 0 ||
              visibleResults[visibleResults.length - 1]?.id === effectiveActiveResultId
            }
            onClick={() => navigateResult(1)}
            type="button"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
            Next
          </button>
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

      {visibleResults.length > 0 ? (
        <section className="space-y-5">
          {groupedResults.map((group) => (
            <section className="space-y-3" key={group.suiteId}>
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
                  {group.suiteName}
                </h2>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {group.results.length} tests
                </span>
              </div>
              <div className="space-y-4">
                {group.results.map((result) => (
                  <TestCaseRunner
                    disabled={!canExecute}
                    disabledReason={disabledReason}
                    isActive={effectiveActiveResultId === result.id}
                    isSubmitting={submittingResultId === result.id}
                    key={result.id}
                    onActivate={() => setActiveResultId(result.id)}
                    onSubmit={handleSubmit}
                    result={result}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <ClipboardCheck className="mx-auto h-8 w-8 text-zinc-400" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
            {showFailedOnly ? 'No failed tests' : 'No results yet'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {showFailedOnly
              ? 'Clear the failed filter to see the full run.'
              : 'This run has no test cases queued for execution.'}
          </p>
          <button
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={onBack}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Return to runs
          </button>
        </div>
      )}
    </div>
  );
}

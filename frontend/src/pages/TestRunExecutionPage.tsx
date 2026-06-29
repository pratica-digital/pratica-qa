import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ClipboardCheck,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { canManageTests } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { TestCaseRunner } from '../components/test-run/TestCaseRunner';
import { TestRunStatusBadge, UserRoleBadge } from '../components/badges';
import { ApiError, testResultsApi, testRunsApi } from '../lib/api';
import { testResultStatusLabel } from '../lib/labels';
import type {
  ExecuteTestResultPayload,
  TestResult,
  TestResultAttachment,
  TestResultStatus,
  TestRun,
} from '../types/testRun';

type TestRunExecutionPageProps = {
  testRun: TestRun;
  onBack: () => void;
  onRunUpdated: (testRun: TestRun) => void;
};

function countResults(results: TestResult[] | undefined, status: TestResult['status']) {
  return results?.filter((result) => result.status === status).length ?? 0;
}

type StatusFilter = 'ALL' | TestResultStatus;
type SortMode = 'suite' | 'status' | 'date' | 'executor';

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Aprovados', value: 'PASSED' },
  { label: 'Falhas', value: 'FAILED' },
  { label: 'Ignorados', value: 'SKIPPED' },
  { label: 'Não executados', value: 'PENDING' },
];

const statusOrder: Record<TestResultStatus, number> = {
  FAILED: 0,
  PASSED: 1,
  SKIPPED: 2,
  PENDING: 3,
};

function getResultSuiteName(result: TestResult) {
  return result.testCase.suite?.name ?? 'Suíte não atribuída';
}

function getResultProjectName(result: TestResult) {
  return (
    result.testCase.suite?.project?.name ??
    result.testRun?.project?.name ??
    result.testRun?.projectId ??
    'Projeto'
  );
}

function getStatusLabel(status: TestResultStatus) {
  return testResultStatusLabel(status);
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
    status: updatedResult.testRun?.status ?? current.status,
    completedAt: updatedResult.testRun?.completedAt ?? current.completedAt,
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
      suite.testSuite?.name ?? `Suíte ${suite.position}`,
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
      suiteName: suiteNames.get(suiteId) ?? 'Suíte não atribuída',
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('suite');
  const [collapsedSuiteIds, setCollapsedSuiteIds] = useState<string[]>([]);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const results = useMemo(() => run.results ?? [], [run.results]);
  const failedCount = countResults(results, 'FAILED');
  const visibleResults = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return results
      .filter((result) => statusFilter === 'ALL' || result.status === statusFilter)
      .filter((result) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          result.testCase.title,
          result.testCase.description,
          result.comment,
          getResultProjectName(result),
          getResultSuiteName(result),
          result.executedBy?.name,
          result.lastModifiedBy?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (sortMode === 'status') {
          return statusOrder[left.status] - statusOrder[right.status];
        }

        if (sortMode === 'date') {
          return (
            new Date(right.updatedAt ?? right.executedAt ?? 0).getTime() -
            new Date(left.updatedAt ?? left.executedAt ?? 0).getTime()
          );
        }

        if (sortMode === 'executor') {
          return (left.executedBy?.name ?? '').localeCompare(right.executedBy?.name ?? '');
        }

        return getResultSuiteName(left).localeCompare(getResultSuiteName(right)) ||
          left.testCase.title.localeCompare(right.testCase.title);
      });
  }, [results, search, sortMode, statusFilter]);
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
  const canExecute = Boolean(user && token && canManageTests(user));

  const applyUpdatedResult = useCallback(
    (updatedResult: TestResult) => {
      setRun((current) => {
        const nextRun = mergeUpdatedResult(current, updatedResult);

        onRunUpdated(nextRun);
        return nextRun;
      });
    },
    [onRunUpdated],
  );

  useEffect(() => {
    const authToken = token ?? '';

    if (!authToken) {
      return undefined;
    }

    let cancelled = false;

    async function fetchFreshRun() {
      try {
        const freshRun = await testRunsApi.get(authToken, testRun.id);

        if (cancelled) {
          return;
        }

        setRun(freshRun);
        onRunUpdated(freshRun);
        setActiveResultId((current) => current ?? freshRun.results?.[0]?.id ?? null);
      } catch (fetchError) {
        if (!cancelled) {
      setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível recarregar a execução.');
        }
      }
    }

    void fetchFreshRun();

    return () => {
      cancelled = true;
    };
  }, [onRunUpdated, testRun.id, token]);

  const disabledReason = useMemo(() => {
    if (!user) {
      return 'É necessário entrar para executar esta rodada.';
    }

    if (user.role === 'VIEWER') {
      return 'Modo visualizador é somente leitura.';
    }

    if (canManageTests(user)) {
      return undefined;
    }

    return 'A execução está disponível para usuários QA e administradores.';
  }, [user]);

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
      });
      applyUpdatedResult(updatedResult);
      setSuccess(`${result.testCase.title} marcado como ${getStatusLabel(payload.status)}.`);
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 403) {
        setError('Você não tem permissão para atualizar este resultado.');
      } else {
        setError(submitError instanceof Error ? submitError.message : 'Não foi possível atualizar o resultado.');
      }
    } finally {
      setSubmittingResultId(null);
    }
  };

  const handleUploadAttachments = async (result: TestResult, files: File[]) => {
    if (!token || files.length === 0) {
      return;
    }

    setError('');
    setSuccess('');
    setSubmittingResultId(result.id);

    try {
      const updatedResult = await testResultsApi.uploadAttachments(token, result.id, files);

      applyUpdatedResult(updatedResult);
      setSuccess(
        `${files.length} arquivo${files.length > 1 ? 's' : ''} de evidência enviado${files.length > 1 ? 's' : ''} para ${result.testCase.title}.`,
      );
    } catch (uploadError) {
      if (uploadError instanceof ApiError && uploadError.status === 403) {
        setError('Você não tem permissão para enviar evidências.');
      } else {
        setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar a evidência.');
      }
    } finally {
      setSubmittingResultId(null);
    }
  };

  const handleRemoveAttachment = async (
    result: TestResult,
    attachment: TestResultAttachment,
  ) => {
    if (!token) {
      return;
    }

    setError('');
    setSuccess('');
    setSubmittingResultId(result.id);

    try {
      const updatedResult = await testResultsApi.removeAttachment(token, result.id, attachment.id);

      applyUpdatedResult(updatedResult);
      setSuccess('Evidência removida.');
    } catch (removeError) {
      if (removeError instanceof ApiError && removeError.status === 403) {
        setError('Você não tem permissão para remover evidências.');
      } else {
        setError(removeError instanceof Error ? removeError.message : 'Não foi possível remover a evidência.');
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
        setSuccess('Não há testes com falha para reexecutar.');
        return;
      }

      setRun(response.testRun);
      onRunUpdated(response.testRun);
      setStatusFilter('ALL');
      setActiveResultId(response.testRun.results?.[0]?.id ?? null);
      setSuccess(`${response.failedCount} teste${response.failedCount === 1 ? '' : 's'} com falha enfileirado${response.failedCount === 1 ? '' : 's'} para reexecução.`);
    } catch (rerunError) {
      if (rerunError instanceof ApiError && rerunError.status === 403) {
        setError('Você não tem permissão para reexecutar testes com falha.');
      } else {
        setError(rerunError instanceof Error ? rerunError.message : 'Não foi possível reexecutar os testes com falha.');
      }
    } finally {
      setRerunning(false);
    }
  };

  const toggleSuiteGroup = (suiteId: string) => {
    setCollapsedSuiteIds((current) =>
      current.includes(suiteId)
        ? current.filter((item) => item !== suiteId)
        : [...current, suiteId],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </button>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">
              {run.project?.name ?? 'Execução'}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
              {run.name}
            </h1>
            {run.description ? (
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {run.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-80 lg:grid-cols-1">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Responsável
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-slate-950">
                {run.assignedTo?.name ?? 'Não atribuído'}
              </span>
              {run.assignedTo?.role ? <UserRoleBadge role={run.assignedTo.role} /> : null}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase text-slate-500">
                Status da execução
              </span>
              <TestRunStatusBadge status={run.status} />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
              <div>
                <p className="font-semibold text-slate-950">{countResults(results, 'PASSED')}</p>
                <p className="text-xs text-slate-500">Aprov.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">{countResults(results, 'FAILED')}</p>
                <p className="text-xs text-slate-500">Falha</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">{countResults(results, 'SKIPPED')}</p>
                <p className="text-xs text-slate-500">Ignor.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">{countResults(results, 'PENDING')}</p>
                <p className="text-xs text-slate-500">Aberto</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {statusFilters.map((filter) => (
              <button
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${
                  statusFilter === filter.value
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                type="button"
              >
                <Filter className="h-4 w-4" aria-hidden="true" />
                {filter.label}
                {filter.value !== 'ALL' ? (
                  <span className="rounded bg-white/20 px-1.5 text-xs">
                    {countResults(results, filter.value)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_14rem]">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500">
              <Search className="h-4 w-4" aria-hidden="true" />
              <input
                className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar caso, suíte, executor ou comentário"
                type="search"
                value={search}
              />
            </label>
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              value={sortMode}
            >
              <option value="suite">Ordenar por suíte</option>
              <option value="status">Ordenar por status</option>
              <option value="date">Ordenar por última atualização</option>
              <option value="executor">Ordenar por executor</option>
            </select>
          </div>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canExecute || failedCount === 0 || rerunning}
            onClick={() => void handleRerunFailed()}
            type="button"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {rerunning ? 'Criando reexecução' : 'Reexecutar falhas'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {visibleResults.length} teste{visibleResults.length === 1 ? '' : 's'}
          </span>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={visibleResults.length === 0 || visibleResults[0]?.id === effectiveActiveResultId}
            onClick={() => navigateResult(-1)}
            type="button"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
            Anterior
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              visibleResults.length === 0 ||
              visibleResults[visibleResults.length - 1]?.id === effectiveActiveResultId
            }
            onClick={() => navigateResult(1)}
            type="button"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
            Próximo
          </button>
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

      {visibleResults.length > 0 ? (
        <section className="space-y-5">
          {groupedResults.map((group) => (
            <section className="space-y-3" key={group.suiteId}>
              <button
                className="flex w-full items-center justify-between gap-3 border-b border-slate-200 pb-2 text-left"
                onClick={() => toggleSuiteGroup(group.suiteId)}
                type="button"
              >
                <h2 className="text-sm font-semibold text-slate-950">
                  {group.suiteName}
                </h2>
                <span className="text-xs font-medium text-slate-500">
                  {group.results.length} teste{group.results.length === 1 ? '' : 's'}
                  {collapsedSuiteIds.includes(group.suiteId) ? ' - recolhida' : ''}
                </span>
              </button>
              <div className={`space-y-4 ${collapsedSuiteIds.includes(group.suiteId) ? 'hidden' : ''}`}>
                {group.results.map((result) => (
                  <TestCaseRunner
                    disabled={!canExecute}
                    disabledReason={disabledReason}
                    isActive={effectiveActiveResultId === result.id}
                    isSubmitting={submittingResultId === result.id}
                    key={result.id}
                    onActivate={() => setActiveResultId(result.id)}
                    onRemoveAttachment={handleRemoveAttachment}
                    onSubmit={handleSubmit}
                    onUploadAttachments={handleUploadAttachments}
                    result={result}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ClipboardCheck className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-slate-950">
            {statusFilter === 'ALL' && !search.trim() ? 'Nenhum resultado ainda' : 'Nenhum resultado correspondente'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {statusFilter === 'ALL' && !search.trim()
              ? 'Esta execução não tem casos de teste enfileirados.'
              : 'Ajuste o filtro de status ou a busca para ver mais testes.'}
          </p>
          <button
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700"
            onClick={onBack}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Voltar para execuções
          </button>
        </div>
      )}
    </div>
  );
}

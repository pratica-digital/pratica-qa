import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileText,
  PlayCircle,
  RefreshCw,
  SkipForward,
  UserRound,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canManageTests } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { TestCaseRunner } from '../components/test-run/TestCaseRunner';
import { ApiError, testResultsApi, testRunsApi } from '../lib/api';
import { testResultStatusLabel } from '../lib/labels';
import { getResultTestCase } from '../lib/testResultOverrides';
import { summarizeTestResults } from '../lib/testRunSummary';
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
  onOpenReport?: (testRunId: string) => void;
  onRunUpdated: (testRun: TestRun) => void;
};

type RunCaseEditDraft = {
  title: string;
  description: string;
  expectedResult: string;
  steps: Array<{
    id?: string;
    description: string;
    expectedResult: string;
  }>;
};

const navigationStatusConfig: Record<
  TestResultStatus,
  {
    icon: LucideIcon;
    className: string;
  }
> = {
  PASSED: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  FAILED: {
    icon: XCircle,
    className: 'border-red-200 bg-red-50 text-red-800',
  },
  SKIPPED: {
    icon: SkipForward,
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  PENDING: {
    icon: Circle,
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  },
};

function getResultSuiteName(result: TestResult) {
  return result.testCase.suite?.name ?? 'Suíte não atribuída';
}

function getStatusLabel(status: TestResultStatus) {
  return testResultStatusLabel(status);
}

function createRunCaseEditDraft(result: TestResult): RunCaseEditDraft {
  const testCase = getResultTestCase(result);

  return {
    title: testCase.title,
    description: testCase.description ?? '',
    expectedResult: testCase.expectedResult ?? '',
    steps: (testCase.steps ?? []).map((step) => ({
      id: step.id,
      description: step.description,
      expectedResult: step.expectedResult ?? '',
    })),
  };
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
      },
    };
  });

  return {
    ...current,
    status: updatedResult.testRun?.status ?? current.status,
    completedAt: updatedResult.testRun?.completedAt ?? current.completedAt,
    updatedAt: updatedResult.testRun?.updatedAt ?? current.updatedAt,
    results,
  } satisfies TestRun;
}

function getSuiteId(result: TestResult) {
  return result.testCase.suiteId ?? 'without-suite';
}

function orderResultsForNavigation(run: TestRun, results: TestResult[]) {
  const originalOrder = new Map(results.map((result, index) => [result.id, index]));
  const suiteOrder = new Map(
    [...(run.suites ?? [])]
      .sort((left, right) => left.position - right.position)
      .map((suite, index) => [suite.testSuiteId, index]),
  );

  return [...results].sort((left, right) => {
    const leftSuiteOrder = suiteOrder.get(getSuiteId(left)) ?? Number.MAX_SAFE_INTEGER;
    const rightSuiteOrder = suiteOrder.get(getSuiteId(right)) ?? Number.MAX_SAFE_INTEGER;

    if (leftSuiteOrder !== rightSuiteOrder) {
      return leftSuiteOrder - rightSuiteOrder;
    }

    return (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
  });
}

type TestCaseListPanelProps = {
  activeResultId: string | null;
  onClose: () => void;
  onSelect: (resultId: string) => void;
  results: TestResult[];
};

function TestCaseListPanel({
  activeResultId,
  onClose,
  onSelect,
  results,
}: TestCaseListPanelProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-slate-950/20 p-0 backdrop-blur-[1px] sm:p-3"
      onClick={onClose}
      role="presentation"
    >
      <aside
        aria-label="Lista de casos de teste"
        className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:rounded-lg sm:border sm:border-slate-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-950">Casos do Test Run</h2>
            <p className="text-xs text-slate-500">{results.length} caso{results.length === 1 ? '' : 's'}</p>
          </div>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            title="Fechar lista"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {results.map((result, index) => {
              const testCase = getResultTestCase(result);
              const isActive = result.id === activeResultId;
              const statusConfig = navigationStatusConfig[result.status];
              const StatusIcon = statusConfig.icon;

              return (
                <button
                  className={`flex w-full gap-3 rounded-lg border p-3 text-left transition ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50'
                  }`}
                  key={result.id}
                  onClick={() => onSelect(result.id)}
                  type="button"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-950">
                      {testCase.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {index + 1}/{results.length} - {getResultSuiteName(result)}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      {isActive ? (
                        <span className="inline-flex h-6 items-center gap-1 rounded-md border border-blue-200 bg-blue-100 px-2 text-xs font-medium text-blue-800">
                          <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Atual
                        </span>
                      ) : null}
                      <span
                        className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium ${statusConfig.className}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {getStatusLabel(result.status)}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function TestRunExecutionPage({
  testRun,
  onBack,
  onOpenReport,
  onRunUpdated,
}: TestRunExecutionPageProps) {
  const { token, user } = useAuth();
  const [run, setRun] = useState(testRun);
  const [submittingResultId, setSubmittingResultId] = useState<string | null>(null);
  const [activeResultId, setActiveResultId] = useState(() => testRun.results?.[0]?.id ?? null);
  const contentTopRef = useRef<HTMLDivElement>(null);
  const [caseListOpen, setCaseListOpen] = useState(false);
  const [draftComments, setDraftComments] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingResult, setEditingResult] = useState<TestResult | null>(null);
  const [editDraft, setEditDraft] = useState<RunCaseEditDraft | null>(null);
  const [editError, setEditError] = useState('');
  const [savingRunCaseEdit, setSavingRunCaseEdit] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TestResult | null>(null);
  const [removingResult, setRemovingResult] = useState(false);

  const results = useMemo(() => run.results ?? [], [run.results]);
  const summary = useMemo(() => summarizeTestResults(results), [results]);
  const navigationResults = useMemo(() => orderResultsForNavigation(run, results), [results, run]);
  const navigationPositionById = useMemo(
    () => new Map(navigationResults.map((result, index) => [result.id, index])),
    [navigationResults],
  );
  const currentIndex = useMemo(() => {
    if (navigationResults.length === 0) {
      return -1;
    }

    if (!activeResultId) {
      return 0;
    }

    return navigationPositionById.get(activeResultId) ?? 0;
  }, [activeResultId, navigationPositionById, navigationResults.length]);
  const currentResult = currentIndex >= 0 ? navigationResults[currentIndex] : null;
  const effectiveActiveResultId = currentResult?.id ?? null;
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

  const selectResult = useCallback(
    (resultId: string) => {
      if (!navigationPositionById.has(resultId)) {
        return;
      }

      setActiveResultId(resultId);
    },
    [navigationPositionById],
  );

  useEffect(() => {
    if (!effectiveActiveResultId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      contentTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [effectiveActiveResultId]);

  useEffect(() => {
    if (!caseListOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setCaseListOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [caseListOpen]);

  const persistResult = useCallback(async (
    result: TestResult,
    payload: ExecuteTestResultPayload,
    options: { announceSuccess?: boolean } = {},
  ) => {
    if (!token) {
      return false;
    }

    const announceSuccess = options.announceSuccess ?? true;

    setError('');
    if (announceSuccess) {
      setSuccess('');
    }
    setSubmittingResultId(result.id);

    try {
      const updatedResult = await testResultsApi.update(token, result.id, {
        status: payload.status,
        comment: payload.comment,
      });
      applyUpdatedResult(updatedResult);
      setDraftComments((current) => ({
        ...current,
        [result.id]: payload.comment ?? '',
      }));
      if (announceSuccess) {
        setSuccess(`${getResultTestCase(result).title} marcado como ${getStatusLabel(payload.status)}.`);
      }

      return true;
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 403) {
        setError('Você não tem permissão para atualizar este resultado.');
      } else {
        setError(submitError instanceof Error ? submitError.message : 'Não foi possível atualizar o resultado.');
      }

      return false;
    } finally {
      setSubmittingResultId(null);
    }
  }, [applyUpdatedResult, token]);

  const handleDraftCommentChange = useCallback((resultId: string, value: string) => {
    setDraftComments((current) => ({ ...current, [resultId]: value }));
  }, []);

  const navigateToNextResult = useCallback((resultId: string) => {
    const currentIndex = navigationPositionById.get(resultId) ?? -1;
    const nextResult = currentIndex >= 0 ? navigationResults[currentIndex + 1] : undefined;

    if (nextResult) {
      selectResult(nextResult.id);
    }
  }, [navigationPositionById, navigationResults, selectResult]);

  const handleSubmit = async (result: TestResult, payload: ExecuteTestResultPayload) => {
    const saved = await persistResult(result, payload);

    if (saved) {
      navigateToNextResult(result.id);
    }
  };

  const handleNavigateNext = useCallback(async (
    result: TestResult,
    payload: ExecuteTestResultPayload,
    hasDraftChanges: boolean,
  ) => {
    if (hasDraftChanges) {
      const saved = await persistResult(result, payload, { announceSuccess: false });

      if (!saved) {
        return;
      }
    }

    navigateToNextResult(result.id);
  }, [navigateToNextResult, persistResult]);

  const handleSelectFromList = useCallback(
    (resultId: string) => {
      setCaseListOpen(false);
      selectResult(resultId);
    },
    [selectResult],
  );

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
        `${files.length} arquivo${files.length > 1 ? 's' : ''} de evidência enviado${files.length > 1 ? 's' : ''} para ${getResultTestCase(result).title}.`,
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

  function openRunCaseEdit(result: TestResult) {
    setError('');
    setSuccess('');
    setEditError('');
    setEditingResult(result);
    setEditDraft(createRunCaseEditDraft(result));
  }

  function closeRunCaseEdit() {
    if (savingRunCaseEdit) {
      return;
    }

    setEditingResult(null);
    setEditDraft(null);
    setEditError('');
  }

  const handleSaveRunCaseEdit = async () => {
    if (!token || !editingResult || !editDraft) {
      return;
    }

    const title = editDraft.title.trim();
    const steps = editDraft.steps.map((step, index) => ({
      id: step.id,
      order: index + 1,
      description: step.description.trim(),
      expectedResult: step.expectedResult.trim(),
    }));

    if (!title) {
      setEditError('Informe um título para o caso.');
      return;
    }

    if (steps.some((step) => !step.description)) {
      setEditError('Todos os passos precisam de descrição.');
      return;
    }

    setEditError('');
    setError('');
    setSuccess('');
    setSavingRunCaseEdit(true);

    try {
      const updatedResult = await testResultsApi.update(token, editingResult.id, {
        title,
        description: editDraft.description.trim(),
        expectedResult: editDraft.expectedResult.trim(),
        steps,
      });

      applyUpdatedResult(updatedResult);
      setSuccess(`${title} atualizado somente nesta execução.`);
      setEditingResult(null);
      setEditDraft(null);
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.status === 403) {
        setEditError('Você não tem permissão para editar este caso nesta execução.');
      } else {
        setEditError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar a edição.');
      }
    } finally {
      setSavingRunCaseEdit(false);
    }
  };

  const handleConfirmRemoveRunCase = async () => {
    if (!token || !removeTarget) {
      return;
    }

    const removedTitle = getResultTestCase(removeTarget).title;

    setError('');
    setSuccess('');
    setRemovingResult(true);

    try {
      await testResultsApi.remove(token, removeTarget.id);
      const freshRun = await testRunsApi.get(token, run.id);

      setRun(freshRun);
      onRunUpdated(freshRun);
      setActiveResultId((current) =>
        current === removeTarget.id ? freshRun.results?.[0]?.id ?? null : current,
      );
      setRemoveTarget(null);
      setSuccess(`${removedTitle} removido somente desta execução.`);
    } catch (removeError) {
      if (removeError instanceof ApiError && removeError.status === 403) {
        setError('Você não tem permissão para remover este caso da execução.');
      } else {
        setError(removeError instanceof Error ? removeError.message : 'Não foi possível remover o caso da execução.');
      }
    } finally {
      setRemovingResult(false);
    }
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

        {onOpenReport ? (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
            onClick={() => onOpenReport(run.id)}
            type="button"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Ver relatório atualizado
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-slate-500">Progresso</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {summary.executed}/{summary.total} ({summary.progressPercentage}%)
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-medium uppercase text-emerald-700">Aprovados</p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">{summary.passed}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-medium uppercase text-red-700">Falhas</p>
            <p className="mt-1 text-sm font-semibold text-red-900">{summary.failed}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium uppercase text-amber-700">Ignorados</p>
            <p className="mt-1 text-sm font-semibold text-amber-900">{summary.skipped}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-medium uppercase text-blue-700">Aprovação</p>
            <p className="mt-1 text-sm font-semibold text-blue-900">{summary.approvalPercentage}%</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Responsável
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-950">
              {run.assignedTo?.name ?? 'Não atribuído'}
            </p>
          </div>
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

      {currentResult ? (
        <section className="space-y-4" ref={contentTopRef}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-950">
                {getResultSuiteName(currentResult)}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Caso {currentIndex + 1} de {navigationResults.length}
              </p>
            </div>
          </div>

          <TestCaseRunner
            disabled={!canExecute}
            disabledReason={disabledReason}
            draftComment={draftComments[currentResult.id] ?? currentResult.comment ?? ''}
            isActive
            isLast={currentIndex === navigationResults.length - 1}
            isSubmitting={submittingResultId === currentResult.id}
            key={currentResult.id}
            onActivate={() => setActiveResultId(currentResult.id)}
            onDraftCommentChange={handleDraftCommentChange}
            onEditRunCase={openRunCaseEdit}
            onNext={handleNavigateNext}
            onOpenList={() => setCaseListOpen(true)}
            onRemoveAttachment={handleRemoveAttachment}
            onRemoveRunCase={setRemoveTarget}
            onSubmit={handleSubmit}
            onUploadAttachments={handleUploadAttachments}
            position={currentIndex + 1}
            result={currentResult}
            runAssignee={run.assignedTo}
            total={navigationResults.length}
          />
        </section>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ClipboardCheck className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-slate-950">
            Nenhum resultado ainda
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Esta execução não tem casos de teste enfileirados.
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

      {caseListOpen ? (
        <TestCaseListPanel
          activeResultId={effectiveActiveResultId}
          onClose={() => setCaseListOpen(false)}
          onSelect={handleSelectFromList}
          results={navigationResults}
        />
      ) : null}

      {editingResult && editDraft ? (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-600/40 px-4 py-6 backdrop-blur-sm sm:items-center"
          onClick={(event) => event.target === event.currentTarget && closeRunCaseEdit()}
          role="presentation"
        >
          <form
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveRunCaseEdit();
            }}
            role="dialog"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">
                Editar caso neste run
              </h2>
            </div>

            <div className="space-y-4 px-5 py-4">
              {editError ? (
                <p className="rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-800">
                  {editError}
                </p>
              ) : null}

              <label className="block text-xs font-medium uppercase text-slate-500">
                Título
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current ? { ...current, title: event.target.value } : current,
                    )
                  }
                  value={editDraft.title}
                />
              </label>

              <label className="block text-xs font-medium uppercase text-slate-500">
                Descrição
                <textarea
                  className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current ? { ...current, description: event.target.value } : current,
                    )
                  }
                  value={editDraft.description}
                />
              </label>

              <label className="block text-xs font-medium uppercase text-slate-500">
                Resultado esperado
                <textarea
                  className="mt-2 min-h-20 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current ? { ...current, expectedResult: event.target.value } : current,
                    )
                  }
                  value={editDraft.expectedResult}
                />
              </label>

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-medium uppercase text-slate-500">Passos</h3>
                  <button
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-700 bg-blue-700 px-3 text-xs font-medium text-white transition hover:bg-blue-800"
                    onClick={() =>
                      setEditDraft((current) =>
                        current
                          ? {
                              ...current,
                              steps: [
                                ...current.steps,
                                { description: '', expectedResult: '' },
                              ],
                            }
                          : current,
                      )
                    }
                    type="button"
                  >
                    Adicionar passo
                  </button>
                </div>

                <div className="space-y-2">
                  {editDraft.steps.map((step, index) => (
                    <div
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      key={`${step.id ?? 'new'}-${index}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase text-slate-500">
                          Passo {index + 1}
                        </span>
                        <button
                          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300"
                          disabled={editDraft.steps.length === 1}
                          onClick={() =>
                            setEditDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
                                  }
                                : current,
                            )
                          }
                          type="button"
                        >
                          Remover
                        </button>
                      </div>
                      <textarea
                        className="mt-2 min-h-16 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        onChange={(event) =>
                          setEditDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  steps: current.steps.map((item, stepIndex) =>
                                    stepIndex === index
                                      ? { ...item, description: event.target.value }
                                      : item,
                                  ),
                                }
                              : current,
                          )
                        }
                        placeholder="Descrição do passo"
                        value={step.description}
                      />
                      <textarea
                        className="mt-2 min-h-14 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        onChange={(event) =>
                          setEditDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  steps: current.steps.map((item, stepIndex) =>
                                    stepIndex === index
                                      ? { ...item, expectedResult: event.target.value }
                                      : item,
                                  ),
                                }
                              : current,
                          )
                        }
                        placeholder="Resultado esperado do passo"
                        value={step.expectedResult}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-600 px-4 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingRunCaseEdit}
                onClick={closeRunCaseEdit}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingRunCaseEdit}
                type="submit"
              >
                {savingRunCaseEdit ? 'Salvando' : 'Salvar nesta execução'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {removeTarget ? (
        <DeleteConfirmationModal
          description={`Isso remove "${getResultTestCase(removeTarget).title}" somente desta execução. O caso de teste original continua existindo.`}
          loading={removingResult}
          onCancel={() => !removingResult && setRemoveTarget(null)}
          onConfirm={() => void handleConfirmRemoveRunCase()}
          title="Remover caso deste run"
        />
      ) : null}
    </div>
  );
}

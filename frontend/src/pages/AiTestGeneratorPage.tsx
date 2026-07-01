import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  FileText,
  ListChecks,
  RefreshCw,
  Save,
  Upload,
} from 'lucide-react';
import { canManageTests } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { aiTestGeneratorApi, testSuitesApi } from '../lib/api';
import type {
  AiExtractedRelease,
  AiGeneratedStep,
  AiGeneratedTestCase,
  AiGenerationRecord,
  AiReleaseAnalysis,
  ManagedTestSuite,
} from '../types/testRun';

type Stage = 'idle' | 'extracting' | 'analyzing' | 'generating' | 'saving';

const acceptedReleaseTypes = '.pdf,.docx,.txt,.md,.markdown';
const stageLabels: Record<Stage, string> = {
  idle: '',
  extracting: 'a extracao terminar',
  analyzing: 'a analise terminar',
  generating: 'a geracao terminar',
  saving: 'o salvamento terminar',
};

function getCaseId(testCase: AiGeneratedTestCase, index: number) {
  return testCase.id || `case-${index + 1}`;
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function isGeneratedTestCase(value: unknown): value is AiGeneratedTestCase {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'titulo' in value &&
      'passos' in value &&
      Array.isArray((value as AiGeneratedTestCase).passos),
  );
}

function createEmptyStep(): AiGeneratedStep {
  return {
    descricao: '',
    resultado_esperado: '',
  };
}

type AiTestGeneratorPageProps = {
  embedded?: boolean;
};

export function AiTestGeneratorPage({ embedded = false }: AiTestGeneratorPageProps = {}) {
  const { token, user } = useAuth();
  const canEdit = canManageTests(user);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [fileName, setFileName] = useState('');
  const [releaseText, setReleaseText] = useState('');
  const [extracted, setExtracted] = useState<AiExtractedRelease | null>(null);
  const [analysis, setAnalysis] = useState<AiReleaseAnalysis | null>(null);
  const [generation, setGeneration] = useState<AiGenerationRecord | null>(null);
  const [editableCases, setEditableCases] = useState<AiGeneratedTestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [suites, setSuites] = useState<ManagedTestSuite[]>([]);
  const [suiteId, setSuiteId] = useState('');
  const [actionResults, setActionResults] = useState<Record<string, string>>({});
  const [activeActionKey, setActiveActionKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedCases = useMemo(
    () => editableCases.filter((testCase, index) => selectedIds.includes(getCaseId(testCase, index))),
    [editableCases, selectedIds],
  );

  const isBusy = stage !== 'idle';
  const hasReleaseText = releaseText.trim().length > 0;
  const hasAnalysis = Boolean(analysis?.changes?.length);
  const hasGeneratedCases = editableCases.length > 0;
  const hasSelectedCases = selectedCases.length > 0;
  const hasSuite = Boolean(suiteId);
  const generateBlockedReason = getGenerateBlockedReason();
  const saveBlockedReason = getSaveBlockedReason();
  const canGenerateTests = !generateBlockedReason;
  const canSaveCases = !saveBlockedReason;

  function getGenerateBlockedReason() {
    if (!canEdit) {
      return 'Apenas usuarios ADMIN ou QA podem gerar casos.';
    }

    if (isBusy) {
      return `Aguarde ${stageLabels[stage]}.`;
    }

    if (!hasReleaseText) {
      return 'Informe ou envie uma Release Notes antes de gerar casos.';
    }

    if (!hasAnalysis) {
      return 'Conclua a analise da Release Notes antes de gerar casos.';
    }

    return '';
  }

  function getSaveBlockedReason() {
    if (!canEdit) {
      return 'Apenas usuarios ADMIN ou QA podem salvar casos.';
    }

    if (isBusy) {
      return `Aguarde ${stageLabels[stage]}.`;
    }

    if (!hasGeneratedCases) {
      return hasAnalysis
        ? 'Gere os casos de teste antes de salvar.'
        : 'Analise a Release Notes e gere casos de teste antes de salvar.';
    }

    if (!hasSelectedCases) {
      return 'Selecione pelo menos um caso de teste para salvar.';
    }

    if (!hasSuite) {
      return 'Selecione a suite onde os casos serao salvos.';
    }

    return '';
  }

  const fetchSuites = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const nextSuites = await testSuitesApi.list(token);
      setSuites(nextSuites);
      setSuiteId((current) => current || nextSuites[0]?.id || '');
    } catch (suiteError) {
      setError(suiteError instanceof Error ? suiteError.message : 'Não foi possível carregar suítes.');
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSuites();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSuites]);

  function resetGeneratedState() {
    setAnalysis(null);
    setGeneration(null);
    setEditableCases([]);
    setSelectedIds([]);
    setActionResults({});
  }

  async function handleFile(file?: File) {
    if (!token || !file) {
      return;
    }

    setStage('extracting');
    setError('');
    setSuccess('');
    resetGeneratedState();

    try {
      const result = await aiTestGeneratorApi.extract(token, file);
      setExtracted(result);
      setFileName(result.fileName);
      setReleaseTitle(result.fileName.replace(/\.[^.]+$/, ''));
      setReleaseText(result.text);
      setSuccess('Texto extraído.');
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : 'Não foi possível extrair o arquivo.');
    } finally {
      setStage('idle');
    }
  }

  async function handleAnalyze() {
    if (!token || !releaseText.trim()) {
      return;
    }

    setStage('analyzing');
    setError('');
    setSuccess('');
    setAnalysis(null);
    setGeneration(null);
    setEditableCases([]);
    setSelectedIds([]);
    setActionResults({});

    try {
      const result = await aiTestGeneratorApi.analyze(token, {
        releaseNotes: releaseText,
        releaseTitle,
        fileName,
      });
      if (!result.analysis?.changes?.length) {
        throw new Error('Analise concluida, mas nenhuma alteracao foi retornada.');
      }

      setAnalysis(result.analysis);
      setSuccess('Análise concluída.');
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : 'Não foi possível analisar a release.');
    } finally {
      setStage('idle');
    }
  }

  async function handleGenerate() {
    if (!token || !releaseText.trim() || !analysis) {
      return;
    }

    setStage('generating');
    setError('');
    setSuccess('');
    setGeneration(null);

    try {
      const result = await aiTestGeneratorApi.generate(token, {
        releaseNotes: releaseText,
        releaseTitle,
        fileName,
        analysis,
        useCache: true,
      });
      const generatedCases = Array.isArray(result.testCases) ? result.testCases : [];

      if (generatedCases.length === 0) {
        throw new Error('Geracao concluida, mas nenhum caso de teste foi retornado.');
      }

      setGeneration(result);
      setEditableCases(generatedCases);
      setSelectedIds(generatedCases.map(getCaseId));
      setSuccess(result.cached ? 'Casos carregados do cache.' : 'Casos gerados.');
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Não foi possível gerar casos.');
    } finally {
      setStage('idle');
    }
  }

  async function handleSave() {
    if (!token || !suiteId || selectedCases.length === 0) {
      return;
    }

    setStage('saving');
    setError('');
    setSuccess('');

    try {
      const result = await aiTestGeneratorApi.saveCases(token, {
        suiteId,
        generationId: generation?.id,
        cases: editableCases,
        selectedCaseIds: selectedIds,
      });
      setSuccess(`${result.count} caso(s) salvo(s).`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar os casos.');
    } finally {
      setStage('idle');
    }
  }

  async function handleAction(
    action: 'improve' | 'negative-cases' | 'regression' | 'test-data' | 'explain-change',
    testCase: AiGeneratedTestCase,
    index: number,
  ) {
    if (!token) {
      return;
    }

    const caseId = getCaseId(testCase, index);
    const actionKey = `${caseId}:${action}`;
    setActiveActionKey(actionKey);
    setError('');

    try {
      const result = await aiTestGeneratorApi.runAction(token, { action, testCase });

      if (action === 'improve' && isGeneratedTestCase(result)) {
        setEditableCases((current) =>
          current.map((item, itemIndex) => (itemIndex === index ? { ...result, id: caseId } : item)),
        );
      }

      setActionResults((current) => ({
        ...current,
        [caseId]: formatJson(result),
      }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível executar a ação.');
    } finally {
      setActiveActionKey('');
    }
  }

  function toggleSelected(testCase: AiGeneratedTestCase, index: number) {
    const caseId = getCaseId(testCase, index);
    setSelectedIds((current) =>
      current.includes(caseId)
        ? current.filter((item) => item !== caseId)
        : [...current, caseId],
    );
  }

  function toggleAll() {
    if (selectedIds.length === editableCases.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(editableCases.map(getCaseId));
  }

  function updateCase<FieldName extends keyof AiGeneratedTestCase>(
    index: number,
    field: FieldName,
    value: AiGeneratedTestCase[FieldName],
  ) {
    setEditableCases((current) =>
      current.map((testCase, currentIndex) =>
        currentIndex === index ? { ...testCase, [field]: value } : testCase,
      ),
    );
  }

  function updateStep(
    caseIndex: number,
    stepIndex: number,
    field: keyof AiGeneratedStep,
    value: string,
  ) {
    setEditableCases((current) =>
      current.map((testCase, currentIndex) => {
        if (currentIndex !== caseIndex) {
          return testCase;
        }

        return {
          ...testCase,
          passos: testCase.passos.map((step, currentStepIndex) =>
            currentStepIndex === stepIndex ? { ...step, [field]: value } : step,
          ),
        };
      }),
    );
  }

  function addStep(caseIndex: number) {
    setEditableCases((current) =>
      current.map((testCase, currentIndex) =>
        currentIndex === caseIndex
          ? { ...testCase, passos: [...testCase.passos, createEmptyStep()] }
          : testCase,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {embedded ? (
            <h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">
              Gerar Testes
            </h2>
          ) : (
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
              Gerador de Testes com IA
            </h1>
          )}
          <p className="text-sm font-medium text-slate-500">
            {generation ? `${editableCases.length} casos gerados` : 'Release Notes para casos de teste'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            accept={acceptedReleaseTypes}
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canEdit || isBusy}
            onClick={() => fileInputRef.current?.click()}
            title="Enviar release notes"
            type="button"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Enviar
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canEdit || isBusy || !hasReleaseText}
            onClick={() => void handleAnalyze()}
            type="button"
          >
            <Bot className="h-4 w-4" aria-hidden="true" />
            {stage === 'analyzing' ? 'Analisando' : 'Analisar'}
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canGenerateTests}
            onClick={() => void handleGenerate()}
            title={generateBlockedReason || 'Gerar casos de teste'}
            type="button"
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            {stage === 'generating' ? 'Gerando' : 'Gerar Casos'}
          </button>
          {generateBlockedReason && hasAnalysis ? (
            <p className="basis-full text-xs font-medium text-slate-500">
              Gerar Casos: {generateBlockedReason}
            </p>
          ) : null}
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

      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-sm font-semibold text-slate-950">Texto extraído</h2>
          </div>
          <div className="space-y-3 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                disabled={!canEdit || isBusy}
                onChange={(event) => setReleaseTitle(event.target.value)}
                placeholder="Release"
                value={releaseTitle}
              />
              <input
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                disabled={!canEdit || isBusy}
                onChange={(event) => setFileName(event.target.value)}
                placeholder="Arquivo"
                value={fileName}
              />
            </div>
            <textarea
              className="min-h-96 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              disabled={!canEdit || isBusy}
              onChange={(event) => {
                setReleaseText(event.target.value);
                resetGeneratedState();
              }}
              placeholder="Cole ou envie uma Release Notes"
              value={releaseText}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">Seções</h2>
            <div className="mt-3 space-y-2">
              {(extracted?.sections ?? []).map((section) => (
                <div className="flex items-center justify-between gap-2 text-sm" key={section.title}>
                  <span className="truncate text-slate-600">{section.title}</span>
                  <span
                    className={`rounded-lg px-2 py-1 text-xs font-medium ${
                      section.present
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {section.present ? 'OK' : '-'}
                  </span>
                </div>
              ))}
              {!extracted ? <p className="text-sm text-slate-500">Nenhum arquivo extraído.</p> : null}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">Salvar</h2>
            <div className="mt-3 space-y-3">
              <select
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                disabled={!canEdit || isBusy}
                onChange={(event) => setSuiteId(event.target.value)}
                value={suiteId}
              >
                <option value="">Selecione a suíte</option>
                {suites.map((suite) => (
                  <option key={suite.id} value={suite.id}>
                    {suite.project?.name ?? suite.projectId} / {suite.name}
                  </option>
                ))}
              </select>
              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSaveCases}
                onClick={() => void handleSave()}
                title={saveBlockedReason || 'Salvar casos selecionados'}
                type="button"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {stage === 'saving' ? 'Salvando' : `Salvar ${selectedCases.length}`}
              </button>
              {saveBlockedReason ? (
                <p className="text-xs font-medium text-slate-500">{saveBlockedReason}</p>
              ) : null}
            </div>
          </div>
        </aside>
      </section>

      {analysis ? (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Análise da Release</h2>
            <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
              {analysis.changes.length} alterações
            </span>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {analysis.changes.map((change) => (
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={change.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-950">{change.descricao}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {change.modulo} / {change.origem}
                    </p>
                  </div>
                  <span className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-700">
                    {change.prioridade}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-slate-600">{change.impacto}</p>
                <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  {change.trecho_release}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {generation ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Pre-visualizacao</h2>
                <p className="text-xs text-slate-500">
                  {generation.provider} / {generation.model}
                </p>
              </div>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700"
                onClick={toggleAll}
                type="button"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {selectedIds.length === editableCases.length ? 'Limpar selecao' : 'Selecionar todos'}
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {Object.entries(generation.coverage).map(([key, value]) => (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={key}>
                  <p className="text-xs text-slate-500">{key.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{value}%</p>
                </div>
              ))}
            </div>
          </div>

          {editableCases.map((testCase, index) => {
            const caseId = getCaseId(testCase, index);
            const selected = selectedIds.includes(caseId);

            return (
              <article className="rounded-lg border border-slate-200 bg-white shadow-sm" key={caseId}>
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-start md:justify-between">
                  <label className="flex min-w-0 flex-1 items-start gap-3">
                    <input
                      checked={selected}
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      disabled={!canEdit || isBusy}
                      onChange={() => toggleSelected(testCase, index)}
                      type="checkbox"
                    />
                    <span className="min-w-0 flex-1">
                      <input
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit || isBusy}
                        onChange={(event) => updateCase(index, 'titulo', event.target.value)}
                        value={testCase.titulo}
                      />
                      <span className="mt-1 block text-xs text-slate-500">
                        {testCase.modulo} / {testCase.tipo_teste} / {testCase.risco}
                      </span>
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['improve', 'negative-cases', 'regression', 'test-data', 'explain-change'] as const).map(
                      (action) => (
                        <button
                          className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!canEdit || isBusy || activeActionKey === `${caseId}:${action}`}
                          key={action}
                          onClick={() => void handleAction(action, testCase, index)}
                          type="button"
                        >
                          {activeActionKey === `${caseId}:${action}` ? '...' : action}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="grid gap-4 p-4 lg:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Descricao
                    <textarea
                      className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      disabled={!canEdit || isBusy}
                      onChange={(event) => updateCase(index, 'descricao', event.target.value)}
                      value={testCase.descricao}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Resultado esperado
                    <textarea
                      className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      disabled={!canEdit || isBusy}
                      onChange={(event) => updateCase(index, 'resultado_esperado', event.target.value)}
                      value={testCase.resultado_esperado}
                    />
                  </label>
                </div>

                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-950">Passos</h3>
                    <button
                      className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      disabled={!canEdit || isBusy}
                      onClick={() => addStep(index)}
                      type="button"
                    >
                      Passo
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {testCase.passos.map((step, stepIndex) => (
                      <div
                        className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 lg:grid-cols-[2rem_1fr_1fr]"
                        key={`${caseId}:step:${stepIndex}`}
                      >
                        <span className="flex h-9 w-8 items-center justify-center text-sm font-semibold text-slate-500">
                          {stepIndex + 1}
                        </span>
                        <input
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          disabled={!canEdit || isBusy}
                          onChange={(event) => updateStep(index, stepIndex, 'descricao', event.target.value)}
                          value={step.descricao}
                        />
                        <input
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          disabled={!canEdit || isBusy}
                          onChange={(event) =>
                            updateStep(index, stepIndex, 'resultado_esperado', event.target.value)
                          }
                          value={step.resultado_esperado ?? ''}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 border-t border-slate-200 px-4 py-3 text-sm md:grid-cols-3">
                  <label className="font-medium text-slate-700">
                    Origem
                    <input
                      className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      disabled={!canEdit || isBusy}
                      onChange={(event) => updateCase(index, 'origem_release', event.target.value)}
                      value={testCase.origem_release}
                    />
                  </label>
                  <label className="font-medium text-slate-700">
                    Prioridade
                    <input
                      className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      disabled={!canEdit || isBusy}
                      onChange={(event) => updateCase(index, 'prioridade', event.target.value)}
                      value={testCase.prioridade}
                    />
                  </label>
                  <label className="font-medium text-slate-700">
                    Severidade
                    <input
                      className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      disabled={!canEdit || isBusy}
                      onChange={(event) => updateCase(index, 'severidade', event.target.value)}
                      value={testCase.severidade}
                    />
                  </label>
                </div>

                {actionResults[caseId] ? (
                  <pre className="mx-4 mb-4 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">
                    {actionResults[caseId]}
                  </pre>
                ) : null}
              </article>
            );
          })}

          {generation.regressionSuite.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-950">Suíte de Regressão</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs font-medium uppercase text-slate-700">
                    <tr>
                      <th className="px-4 py-3">Caso</th>
                      <th className="px-4 py-3">Risco</th>
                      <th className="px-4 py-3">Justificativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {generation.regressionSuite.map((item) => (
                      <tr key={`${item.case_id}:${item.titulo}`}>
                        <td className="px-4 py-3 font-medium text-slate-950">{item.titulo}</td>
                        <td className="px-4 py-3 text-slate-600">{item.risco}</td>
                        <td className="px-4 py-3 text-slate-600">{item.justificativa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {stage === 'extracting' || stage === 'generating' ? (
        <div className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-lg">
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          {stage === 'extracting' ? 'Extraindo' : 'Gerando'}
        </div>
      ) : null}
    </div>
  );
}

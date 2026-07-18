import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import type {
  ImportTestCasesPayload,
  ImportTestCasesReport,
  ManagedTestSuite,
} from '../../types/testRun';
import { suiteProjectLabel } from '../../lib/labels';
import {
  isSupportedSpreadsheetFile,
  parseSpreadsheetFile,
  toImportPayload,
  type SpreadsheetImportResult,
} from '../../lib/testCaseSpreadsheetImport';

type TestCaseImportModalProps = {
  open: boolean;
  suite: ManagedTestSuite | null;
  onClose: () => void;
  onImport: (payload: ImportTestCasesPayload) => Promise<ImportTestCasesReport>;
};

const MAX_PREVIEW_ROWS = 250;

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function getStatusClasses(status: 'valid' | 'invalid') {
  return status === 'valid'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700';
}

export function TestCaseImportModal({
  open,
  suite,
  onClose,
  onImport,
}: TestCaseImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState<SpreadsheetImportResult | null>(null);
  const [report, setReport] = useState<ImportTestCasesReport | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!importing) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setProgress((current) => Math.min(current + 7, 92));
    }, 350);

    return () => window.clearInterval(intervalId);
  }, [importing]);

  const previewRows = useMemo(() => result?.rows.slice(0, MAX_PREVIEW_ROWS) ?? [], [result]);
  const hiddenPreviewRows = Math.max((result?.rows.length ?? 0) - previewRows.length, 0);
  const canImport = Boolean(result && result.validCount > 0 && !parsing && !importing);
  const largeImport = (result?.validCount ?? 0) >= 200;

  if (!open || !suite) {
    return null;
  }

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setReport(null);
    setParseError('');
    setResult(null);

    if (!isSupportedSpreadsheetFile(file)) {
      setParseError('Formato não suportado. Use .csv, .tsv, .xls ou .xlsx.');
      return;
    }

    setParsing(true);

    try {
      const parsed = await parseSpreadsheetFile(file);
      setResult(parsed);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Não foi possível ler a planilha.');
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    void handleFile(event.dataTransfer.files[0]);
  }

  async function handleConfirm() {
    if (!result || result.validCount === 0) {
      return;
    }

    setProgress(8);
    setImporting(true);
    setParseError('');

    try {
      const nextReport = await onImport({
        requireExpectedResults: result.requireExpectedResults,
        cases: toImportPayload(result.rows),
      });

      setProgress(100);
      setReport({
        ...nextReport,
        skipped: nextReport.skipped + result.invalidCount,
        errors: [...result.errors, ...nextReport.errors],
      });
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Não foi possível importar os casos de teste.');
    } finally {
      setImporting(false);
    }
  }

  const summary = result
    ? [
        {
          label: 'casos encontrados',
          value: result.totalRows,
        },
        {
          label: 'válidos',
          value: result.validCount,
        },
        {
          label: 'com erro',
          value: result.invalidCount,
        },
      ]
    : [];

  return createPortal(
    <div className="fixed inset-0 z-[10001] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-slate-950">
                Importar Casos de Teste
              </h2>
              <p className="truncate text-xs text-slate-500">
                {suiteProjectLabel(suite)} / {suite.name}
              </p>
            </div>
            <button
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={importing}
              onClick={onClose}
              title="Fechar"
              type="button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {report ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {report.imported} casos de teste importados com sucesso.
                </div>
                <p className="mt-2">
                  {report.skipped} linhas foram ignoradas devido a erros.
                </p>
                {report.createdSections.length > 0 ? (
                  <p className="mt-1">
                    Seções criadas: {report.createdSections.join(', ')}.
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div
                  className={`flex min-h-56 flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    {parsing ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                  <p className="mt-4 text-base font-semibold text-slate-950">
                    Importe seus casos de teste.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Formatos suportados:
                    <br />
                    .csv, .tsv, .xls e .xlsx
                  </p>
                  <span className="my-4 text-xs font-medium uppercase text-slate-400">ou</span>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={parsing || importing}
                    onClick={() => inputRef.current?.click()}
                    type="button"
                  >
                    <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                    Selecionar arquivo
                  </button>
                  <input
                    accept=".csv,.tsv,.xls,.xlsx"
                    className="hidden"
                    onChange={(event) => void handleFile(event.target.files?.[0])}
                    ref={inputRef}
                    type="file"
                  />
                </div>

                <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Dicas para usar nossa ferramenta de importação de planilhas
                  </h3>
                  <p className="mt-3 text-sm text-slate-600">
                    Ao inserir os seguintes cabeçalhos de coluna na primeira linha da sua planilha, será possível realizar a correspondência automática das colunas:
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <span>• Título</span>
                    <span>• Descrição</span>
                    <span>• Etapas do teste</span>
                    <span>• Resultados esperados</span>
                  </div>
                  <p className="mt-4 text-sm text-slate-600">
                    Opcionalmente, para importar os casos dentro de uma seção específica, utilize uma coluna chamada:
                  </p>
                  <p className="mt-2 text-sm text-slate-700">• Seção</p>
                  <p className="mt-4 text-sm text-slate-600">
                    Também aceitamos cabeçalhos em inglês exportados por outras ferramentas:
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <span>• Id</span>
                    <span>• Section</span>
                    <span>• Test case number</span>
                    <span>• Title</span>
                    <span>• Description</span>
                    <span>• Test steps</span>
                    <span>• Expected result</span>
                    <span>• Created at</span>
                    <span>• Updated at</span>
                  </div>
                </section>
              </>
            )}

            {parseError ? (
              <p className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {parseError}
              </p>
            ) : null}

            {result ? (
              <section className="mt-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {summary.map((item) => (
                    <div className="rounded-lg border border-slate-200 bg-white p-3" key={item.label}>
                      <p className="text-2xl font-semibold text-slate-950">{item.value}</p>
                      <p className="text-xs text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>

                {result.errors.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      Linhas com erro
                    </div>
                    <div className="mt-2 max-h-36 overflow-y-auto text-sm text-red-700">
                      {result.errors.slice(0, 12).map((error) => (
                        <p key={`${error.rowNumber}-${error.message}`}>
                          Linha {error.rowNumber}: {error.message}
                        </p>
                      ))}
                      {result.errors.length > 12 ? (
                        <p className="mt-1 font-medium">
                          Mais {formatCount(result.errors.length - 12, 'erro oculto', 'erros ocultos')}.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-950">Pré-visualização</h3>
                    <span className="text-xs font-medium text-slate-500">
                      {formatCount(previewRows.length, 'linha exibida', 'linhas exibidas')}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead className="bg-slate-100 text-xs font-medium uppercase text-slate-700">
                        <tr>
                          <th className="px-4 py-3">Título</th>
                          <th className="px-4 py-3">Seção</th>
                          <th className="px-4 py-3">Descrição</th>
                          <th className="px-4 py-3">Quantidade de etapas</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {previewRows.map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="max-w-[18rem] px-4 py-3">
                              <p className="truncate font-medium text-slate-950">
                                {row.title || 'Sem título'}
                              </p>
                            </td>
                            <td className="max-w-[12rem] px-4 py-3 text-slate-600">
                              <p className="truncate">{row.section || 'Raiz da suíte'}</p>
                            </td>
                            <td className="max-w-[22rem] px-4 py-3 text-slate-600">
                              <p className="truncate">{row.description || '-'}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{row.testSteps.length}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${getStatusClasses(row.status)}`}>
                                {row.status === 'valid' ? 'Válido' : 'Inválido'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {hiddenPreviewRows > 0 ? (
                    <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                      Mais {formatCount(hiddenPreviewRows, 'linha', 'linhas')} na planilha. Todas as linhas válidas serão importadas.
                    </p>
                  ) : null}
                </div>

                {importing && largeImport ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                      <span>Importando casos de teste</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-700 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-h-5 text-sm text-slate-500">
              {result && result.invalidCount > 0 && result.validCount > 0
                ? `${result.invalidCount} linhas com erro serão ignoradas.`
                : ''}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="h-9 rounded-lg bg-slate-600 px-4 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={importing}
                onClick={onClose}
                type="button"
              >
                {report ? 'Fechar' : 'Cancelar'}
              </button>
              {!report ? (
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canImport}
                  onClick={() => void handleConfirm()}
                  type="button"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Importando
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      {result?.validCount
                        ? `Importar ${formatCount(result.validCount, 'caso válido', 'casos válidos')}`
                        : 'Importar casos'}
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

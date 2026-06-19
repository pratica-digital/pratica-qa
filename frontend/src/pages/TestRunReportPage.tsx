import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Loader2,
  MinusCircle,
  RefreshCw,
  Tag,
  User,
  XCircle,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import type { TestResult, TestRun } from '../types/testRun';
import { useTestRunReport } from "../hooks/useTestRunReport";

// ─── Types ───────────────────────────────────────────────────────────────────

type TestRunReportPageProps = {
  testRunId: string;
  onBack: () => void;
};

type StatusGroup = 'PASSED' | 'FAILED' | 'SKIPPED' | 'PENDING';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(dateStr),
  );
}

function fmtDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(dateStr));
}

function testTypeLabel(type?: string) {
  const map: Record<string, string> = {
    SMOKE: 'Smoke',
    FUNCIONAL: 'Funcional',
    REGRESSAO: 'Regressão',
    ROBUSTEZ: 'Robustez',
  };
  return type ? (map[type] ?? type) : '—';
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  StatusGroup,
  {
    label: string;
    icon: React.ElementType;
    cardBg: string;
    cardBorder: string;
    cardText: string;
    badgeBg: string;
    badgeText: string;
    sectionBorder: string;
    sectionTitle: string;
    dot: string;
  }
> = {
  PASSED: {
    label: 'Passed',
    icon: CheckCircle2,
    cardBg: 'bg-emerald-100',
    cardBorder: 'border-emerald-200',
    cardText: 'text-emerald-800',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    sectionBorder: 'border-emerald-200',
    sectionTitle: 'text-emerald-800',
    dot: 'bg-emerald-600',
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    cardBg: 'bg-red-100',
    cardBorder: 'border-red-200',
    cardText: 'text-red-800',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    sectionBorder: 'border-red-200',
    sectionTitle: 'text-red-800',
    dot: 'bg-red-600',
  },
  SKIPPED: {
    label: 'Skipped',
    icon: MinusCircle,
    cardBg: 'bg-amber-100',
    cardBorder: 'border-amber-200',
    cardText: 'text-amber-800',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    sectionBorder: 'border-amber-200',
    sectionTitle: 'text-amber-800',
    dot: 'bg-amber-400',
  },
  PENDING: {
    label: 'Not Run',
    icon: Clock,
    cardBg: 'bg-slate-50',
    cardBorder: 'border-slate-200',
    cardText: 'text-slate-500',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-500',
    sectionBorder: 'border-slate-200',
    sectionTitle: 'text-slate-500',
    dot: 'bg-slate-400',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  status,
  count,
  total,
}: {
  status: StatusGroup;
  count: number;
  total: number;
}) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);

  return (
    <div
      className={`rounded-xl border ${cfg.cardBorder} ${cfg.cardBg} p-4 flex flex-col gap-3`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.cardText}`}>
          {cfg.label}
        </span>
        <Icon className={`h-4 w-4 ${cfg.cardText}`} aria-hidden="true" />
      </div>
      <p className={`text-3xl font-bold ${cfg.cardText}`}>{count}</p>
      <div className="space-y-1">
        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-1.5 rounded-full ${cfg.dot}`}
            style={{ width: `${pct}%`, transition: 'width 0.6s ease' }}
          />
        </div>
        <p className="text-xs text-slate-500">{pct}% do total</p>
      </div>
    </div>
  );
}

function TestCaseAccordion({ result }: { result: TestResult }) {
  const [open, setOpen] = useState(false);
  const status = result.status as StatusGroup;
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const tc = result.testCase;

  return (
    <div
      className={`rounded-lg border ${cfg.sectionBorder} bg-white overflow-hidden transition-shadow hover:shadow-sm`}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-expanded={open}
      >
        <Icon className={`h-4 w-4 shrink-0 ${cfg.cardText}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-950 truncate block">
            {tc.title}
          </span>
          {result.executedAt && (
            <span className="text-xs text-slate-500">
              Executado em {fmt(result.executedAt)}
              {result.executedBy ? ` · ${result.executedBy.name}` : ''}
            </span>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}
        >
          {cfg.label}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 space-y-4 pt-4">
          {tc.description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Descrição
              </p>
              <p className="text-sm text-slate-700">{tc.description}</p>
            </div>
          )}

          {tc.steps && tc.steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Steps
              </p>
              <ol className="space-y-2">
                {tc.steps.map((step) => (
                  <li key={step.id} className="flex gap-3 text-sm">
                    <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {step.order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700">{step.description}</p>
                      {step.expectedResult && (
                        <p className="mt-1 text-xs text-slate-500 italic">
                          Esperado: {step.expectedResult}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {tc.expectedResult && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Resultado Esperado
              </p>
              <p className="text-sm text-slate-700">{tc.expectedResult}</p>
            </div>
          )}

          {result.comment && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Observações
              </p>
              <p className="text-sm text-slate-700">{result.comment}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusSection({
  status,
  results,
}: {
  status: StatusGroup;
  results: TestResult[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  if (results.length === 0) return null;

  return (
    <section className="space-y-3">
      <button
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setCollapsed((v) => !v)}
        type="button"
      >
        <Icon className={`h-4 w-4 ${cfg.sectionTitle}`} aria-hidden="true" />
        <h2 className={`text-sm font-semibold ${cfg.sectionTitle}`}>
          {cfg.label}
          <span className="ml-2 text-slate-400 font-normal">({results.length})</span>
        </h2>
        <div className={`flex-1 h-px ${cfg.sectionBorder} border-t`} />
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {results.map((result) => (
            <TestCaseAccordion key={result.id} result={result} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── PDF generation ───────────────────────────────────────────────────────────

async function generatePDF(testRun: TestRun, results: TestResult[]) {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = margin;

  const colors = {
    primary: [30, 58, 138] as [number, number, number],
    passed: [16, 185, 129] as [number, number, number],
    failed: [239, 68, 68] as [number, number, number],
    skipped: [245, 158, 11] as [number, number, number],
    pending: [161, 161, 170] as [number, number, number],
    text: [24, 24, 27] as [number, number, number],
    muted: [113, 113, 122] as [number, number, number],
    border: [228, 228, 231] as [number, number, number],
    bg: [250, 250, 250] as [number, number, number],
  };

  function checkPageBreak(needed: number) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function drawLine(color = colors.border) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  }

  // ── Capa ──
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageW, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Test Run', margin, 22);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(testRun.name, margin, 32);

  doc.setFontSize(8);
  doc.text(`Gerado em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, margin, 42);

  y = 60;

  // ── Informações gerais ──
  doc.setTextColor(...colors.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações Gerais', margin, y);
  y += 6;
  drawLine();

  const suiteTypes = [...new Set((testRun.suites ?? []).map((s) => s.testType).filter(Boolean))];
  const typeLabel = suiteTypes.length > 0
    ? suiteTypes.map((t) => testTypeLabel(t)).join(', ')
    : '—';

  const info = [
    ['Projeto', testRun.project?.name ?? '—'],
    ['Plano de Teste', testRun.testPlan ? `${testRun.testPlan.name} v${testRun.testPlan.version}` : '—'],
    ['Tipo de Teste', typeLabel],
    ['Status', testRun.status],
    ['Responsável', testRun.assignedTo?.name ?? '—'],
    ['Início', fmt(testRun.startedAt)],
    ['Conclusão', fmt(testRun.completedAt)],
    ['Última atualização', fmt(testRun.updatedAt)],
  ];

  doc.setFontSize(9);
  info.forEach(([label, value]) => {
    checkPageBreak(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.muted);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text(String(value), margin + 40, y);
    y += 6;
  });

  y += 6;

  // ── Resumo ──
  checkPageBreak(40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.text);
  doc.text('Resumo de Execução', margin, y);
  y += 6;
  drawLine();

  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const skipped = results.filter((r) => r.status === 'SKIPPED').length;
  const notRun = results.filter((r) => r.status === 'PENDING').length;
  const total = results.length;

  const cardW = (contentW - 9) / 4;
  const summaryItems = [
    { label: 'Passed', value: passed, color: colors.passed },
    { label: 'Failed', value: failed, color: colors.failed },
    { label: 'Skipped', value: skipped, color: colors.skipped },
    { label: 'Not Run', value: notRun, color: colors.pending },
  ];

  checkPageBreak(28);
  summaryItems.forEach((item, i) => {
    const x = margin + i * (cardW + 3);
    doc.setFillColor(...colors.bg);
    doc.roundedRect(x, y, cardW, 22, 2, 2, 'F');
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, 22, 2, 2, 'S');

    doc.setFillColor(...item.color);
    doc.roundedRect(x + 2, y + 2, 3, 18, 1, 1, 'F');

    doc.setTextColor(...colors.muted);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, x + 8, y + 8);

    doc.setTextColor(...item.color);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.value), x + 8, y + 18);
  });

  y += 30;

  // ── Barra de progresso ──
  checkPageBreak(14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.muted);
  doc.text(`Total: ${total} casos de teste`, margin, y);
  y += 4;

  const barH = 4;
  doc.setFillColor(228, 228, 231);
  doc.roundedRect(margin, y, contentW, barH, 1, 1, 'F');

  let barX = margin;
  const barData = [
    { count: passed, color: colors.passed },
    { count: failed, color: colors.failed },
    { count: skipped, color: colors.skipped },
  ];
  barData.forEach(({ count, color }) => {
    if (total === 0 || count === 0) return;
    const w = (count / total) * contentW;
    doc.setFillColor(...color);
    doc.roundedRect(barX, y, w, barH, 1, 1, 'F');
    barX += w;
  });

  y += 12;

  // ── Test Cases ──
  const ORDER: StatusGroup[] = ['FAILED', 'PASSED', 'SKIPPED', 'PENDING'];
  const statusLabels: Record<StatusGroup, string> = {
    FAILED: 'Failed',
    PASSED: 'Passed',
    SKIPPED: 'Skipped',
    PENDING: 'Not Run',
  };
  const statusColors: Record<StatusGroup, [number, number, number]> = {
    PASSED: colors.passed,
    FAILED: colors.failed,
    SKIPPED: colors.skipped,
    PENDING: colors.pending,
  };

  for (const status of ORDER) {
    const group = results.filter((r) => r.status === status);
    if (group.length === 0) continue;

    checkPageBreak(16);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statusColors[status]);
    doc.text(`${statusLabels[status]} (${group.length})`, margin, y);
    y += 5;
    doc.setDrawColor(...statusColors[status]);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    for (const result of group) {
      const tc = result.testCase;
      const stepsCount = tc.steps?.length ?? 0;
      const hasDesc = Boolean(tc.description);
      const hasExpected = Boolean(tc.expectedResult);
      const hasComment = Boolean(result.comment);
      const estimatedH = 14 + (hasDesc ? 8 : 0) + stepsCount * 7 + (hasExpected ? 8 : 0) + (hasComment ? 8 : 0);

      checkPageBreak(estimatedH);

      // Card background
      doc.setFillColor(...colors.bg);
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, y, contentW, estimatedH - 2, 2, 2, 'FD');

      // Status bar
      doc.setFillColor(...statusColors[status]);
      doc.roundedRect(margin, y, 3, estimatedH - 2, 1, 1, 'F');

      const cx = margin + 7;
      let cy = y + 7;

      doc.setTextColor(...colors.text);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(tc.title, contentW - 40);
      doc.text(titleLines, cx, cy);
      cy += titleLines.length * 5;

      if (result.executedAt) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.muted);
        doc.text(
          `Executado: ${fmt(result.executedAt)}${result.executedBy ? ` · ${result.executedBy.name}` : ''}`,
          cx,
          cy,
        );
        cy += 5;
      }

      if (hasDesc) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.muted);
        doc.text('Descrição:', cx, cy);
        cy += 4;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        const descLines = doc.splitTextToSize(tc.description ?? '', contentW - 14);
        doc.text(descLines.slice(0, 2), cx, cy);
        cy += Math.min(descLines.length, 2) * 4 + 1;
      }

      if (stepsCount > 0) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.muted);
        doc.text('Steps:', cx, cy);
        cy += 4;
        tc.steps?.forEach((step) => {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.text);
          const stepText = `${step.order}. ${step.description}`;
          const stepLines = doc.splitTextToSize(stepText, contentW - 18);
          doc.text(stepLines.slice(0, 2), cx + 2, cy);
          cy += Math.min(stepLines.length, 2) * 4 + 1;
        });
      }

      if (hasExpected) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.muted);
        doc.text('Resultado Esperado:', cx, cy);
        cy += 4;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        const expLines = doc.splitTextToSize(tc.expectedResult ?? '', contentW - 14);
        doc.text(expLines.slice(0, 2), cx, cy);
        cy += Math.min(expLines.length, 2) * 4 + 1;
      }

      if (hasComment) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.muted);
        doc.text('Observações:', cx, cy);
        cy += 4;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        const commentLines = doc.splitTextToSize(result.comment ?? '', contentW - 14);
        doc.text(commentLines.slice(0, 2), cx, cy);
      }

      y += estimatedH + 2;
    }

    y += 6;
  }

  // ── Rodapé ──
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...colors.muted);
    doc.text(
      `${testRun.name} · Gerado em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`,
      margin,
      pageH - 8,
    );
    doc.text(`${i} / ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  const safeName = testRun.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`relatorio_${safeName}.pdf`);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TestRunReportPage({ testRunId, onBack }: TestRunReportPageProps) {
  const { report, isLoading, error, refetch } = useTestRunReport(testRunId);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      await generatePDF(report.testRun, report.results);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsExporting(false);
    }
  }, [report]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Carregando relatório…</p>
      </div>
    );
  }

  // ── Error ──
  if (error || !report) {
    return (
      <div className="space-y-4">
        <button
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-950"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="rounded-lg border border-red-200 bg-red-100 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error || 'Relatório não encontrado.'}
        </div>
      </div>
    );
  }

  const { testRun, results, summary } = report;
  const suiteTypes = [...new Set((testRun.suites ?? []).map((s) => s.testType).filter(Boolean))];

  const grouped: Record<StatusGroup, TestResult[]> = {
    FAILED: results.filter((r) => r.status === 'FAILED'),
    PASSED: results.filter((r) => r.status === 'PASSED'),
    SKIPPED: results.filter((r) => r.status === 'SKIPPED'),
    PENDING: results.filter((r) => r.status === 'PENDING'),
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-950"
            onClick={onBack}
            title="Voltar"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-medium text-slate-500">Relatório</p>
            <h1 className="text-lg font-semibold text-slate-950 leading-tight">
              {testRun.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => void refetch()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>

          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isExporting}
            onClick={() => void handleExport()}
            type="button"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? 'Gerando PDF…' : 'Baixar relatório em PDF'}
          </button>
        </div>
      </div>

      {/* Header info */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">
            Informações do Run
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
          {[
            {
              icon: Tag,
              label: 'Projeto',
              value: testRun.project?.name ?? '—',
            },
            {
              icon: FileText,
              label: 'Plano de Teste',
              value: testRun.testPlan
                ? `${testRun.testPlan.name} v${testRun.testPlan.version}`
                : '—',
            },
            {
              icon: Tag,
              label: 'Tipo de Teste',
              value:
                suiteTypes.length > 0
                  ? suiteTypes.map((t) => testTypeLabel(t)).join(', ')
                  : '—',
            },
            {
              icon: User,
              label: 'Responsável',
              value: testRun.assignedTo?.name ?? '—',
            },
            {
              icon: Calendar,
              label: 'Início',
              value: fmtDate(testRun.startedAt),
            },
            {
              icon: Calendar,
              label: 'Conclusão',
              value: fmtDate(testRun.completedAt),
            },
            {
              icon: Clock,
              label: 'Última Atualização',
              value: fmt(testRun.updatedAt),
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                <Icon className="h-3 w-3" aria-hidden="true" />
                {label}
              </p>
              <p className="text-sm font-medium text-slate-950 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard status="PASSED" count={summary.passed} total={summary.total} />
        <SummaryCard status="FAILED" count={summary.failed} total={summary.total} />
        <SummaryCard status="SKIPPED" count={summary.skipped} total={summary.total} />
        <SummaryCard status="PENDING" count={summary.notRun} total={summary.total} />
      </div>

      {/* Progress bar */}
      {summary.total > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Progresso geral</span>
            <span>
              {summary.passed + summary.failed + summary.skipped} / {summary.total} executados
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden bg-slate-100 flex">
            {[
              { count: summary.passed, color: 'bg-emerald-600' },
              { count: summary.failed, color: 'bg-red-600' },
              { count: summary.skipped, color: 'bg-amber-400' },
            ].map(({ count, color }) =>
              count > 0 ? (
                <div
                  key={color}
                  className={`${color} h-full transition-all duration-700`}
                  style={{ width: `${(count / summary.total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            {[
              { label: 'Passed', count: summary.passed, dot: 'bg-emerald-600' },
              { label: 'Failed', count: summary.failed, dot: 'bg-red-600' },
              { label: 'Skipped', count: summary.skipped, dot: 'bg-amber-400' },
              { label: 'Not Run', count: summary.notRun, dot: 'bg-slate-400' },
            ].map(({ label, count, dot }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                <span className="text-xs text-slate-600">
                  {label}: <strong className="text-slate-900">{count}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test case sections */}
      {summary.total === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-950">
            Nenhum caso de teste encontrado
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Este test run ainda não possui resultados registrados.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(['FAILED', 'PASSED', 'SKIPPED', 'PENDING'] as StatusGroup[]).map((status) => (
            <StatusSection key={status} status={status} results={grouped[status]} />
          ))}
        </div>
      )}
    </div>
  );
}

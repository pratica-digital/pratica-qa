import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  FileText,
  FileVideo,
  Loader2,
  MinusCircle,
  Pencil,
  RefreshCw,
  Tag,
  User,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useAuthenticatedAttachmentUrl } from "../hooks/useAuthenticatedAttachmentUrl";
import { MarkdownContent } from "../components/MarkdownContent";
import type {
  TestResult,
  TestResultAttachment,
  TestRun,
} from "../types/testRun";
import { useTestRunReport } from "../hooks/useTestRunReport";
import { testResultsApi } from "../lib/api";
import {
  getAttachmentName,
  isImageAttachment,
  isVideoAttachment,
} from "../lib/attachments";
import { testRunStatusLabel } from "../lib/labels";
import {
  applyPdfInternalLinks,
  buildPdfInternalLinks,
  type PdfLinkArea,
  type PdfPosition,
} from "../lib/pdfInternalLinks";
import {
  calculatePdfImagePlacement,
  canEmbedMorePdfEvidence,
  formatAttachmentSize,
  getAttachmentTypeLabel,
  orderPdfEvidenceAttachments,
  PDF_EVIDENCE_MAX_COUNT,
  preparePdfEvidenceImage,
  shouldStartNewPdfPage,
} from "../lib/pdfEvidence";
import { getResultTestCase } from "../lib/testResultOverrides";
import { summarizeTestResults } from "../lib/testRunSummary";
import praticaLogoUrl from "../assets/pratica-logo.png";

// ─── Types ───────────────────────────────────────────────────────────────────

type TestRunReportPageProps = {
  testRunId: string;
  onBack: () => void;
  onEditResults?: (testRun: TestRun) => void;
};

type StatusGroup = "PASSED" | "FAILED" | "SKIPPED" | "PENDING";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

function fmtDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(dateStr),
  );
}

function testTypeLabel(type?: string) {
  const map: Record<string, string> = {
    SMOKE: "Smoke",
    FUNCIONAL: "Funcional",
    REGRESSAO: "Regressão",
    ROBUSTEZ: "Robustez",
  };
  return type ? (map[type] ?? type) : "—";
}

// ─── Status config ────────────────────────────────────────────────────────────

function attachmentMeta(attachment: TestResultAttachment) {
  const parts = [fmt(attachment.createdAt)];

  if (attachment.uploadedBy?.name) {
    parts.push(attachment.uploadedBy.name);
  }

  return parts.join(" - ");
}

function isExternalHttpUrl(value?: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value.trim()));
}

function getShortcutStoryLabel(result: TestResult) {
  return (
    result.shortcutStoryName?.trim() ||
    `[FAIL] ${getResultTestCase(result).title}`
  );
}

function ShortcutStorySection({ result }: { result: TestResult }) {
  if (result.status !== "FAILED") {
    return null;
  }

  const storyUrl = result.shortcutStoryUrl?.trim();

  return (
    <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
        Shortcut Story
      </p>
      {isExternalHttpUrl(storyUrl) ? (
        <a
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-red-800 underline-offset-2 hover:underline"
          href={storyUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {getShortcutStoryLabel(result)}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      ) : (
        <p className="mt-1 text-sm text-slate-600">
          Story do Shortcut nao disponivel.
        </p>
      )}
    </div>
  );
}

function EvidenceAttachmentCard({
  attachment,
}: {
  attachment: TestResultAttachment;
}) {
  const assetUrl = useAuthenticatedAttachmentUrl(attachment.id);
  const name = getAttachmentName(attachment);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {isImageAttachment(attachment) ? (
        <a
          className="block aspect-video bg-slate-100"
          href={assetUrl}
          rel="noreferrer"
          target="_blank"
        >
          <img
            alt={name}
            className="h-full w-full object-contain"
            src={assetUrl}
          />
        </a>
      ) : isVideoAttachment(attachment) ? (
        <div className="bg-slate-950">
          <video
            className="aspect-video w-full bg-slate-950"
            controls
            preload="metadata"
            src={assetUrl}
          >
            <a className="text-white underline" href={assetUrl}>
              {name}
            </a>
          </video>
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-slate-100 text-slate-400">
          <FileText className="h-6 w-6" aria-hidden="true" />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-slate-600">
            {name}
          </span>
          <span className="block truncate text-[11px] text-slate-400">
            {attachmentMeta(attachment)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {isVideoAttachment(attachment) ? (
            <FileVideo
              className="h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
          ) : null}
          <a
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            href={assetUrl}
            rel="noreferrer"
            target="_blank"
            title="Abrir evidência"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <a
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            download={name}
            href={assetUrl}
            title="Baixar evidência"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </span>
      </div>
    </div>
  );
}

async function loadImageDataUrl(url: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

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
    label: "Aprovado",
    icon: CheckCircle2,
    cardBg: "bg-emerald-100",
    cardBorder: "border-emerald-200",
    cardText: "text-emerald-800",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    sectionBorder: "border-emerald-200",
    sectionTitle: "text-emerald-800",
    dot: "bg-emerald-600",
  },
  FAILED: {
    label: "Falhou",
    icon: XCircle,
    cardBg: "bg-red-100",
    cardBorder: "border-red-200",
    cardText: "text-red-800",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
    sectionBorder: "border-red-200",
    sectionTitle: "text-red-800",
    dot: "bg-red-600",
  },
  SKIPPED: {
    label: "Ignorado",
    icon: MinusCircle,
    cardBg: "bg-amber-100",
    cardBorder: "border-amber-200",
    cardText: "text-amber-800",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    sectionBorder: "border-amber-200",
    sectionTitle: "text-amber-800",
    dot: "bg-amber-400",
  },
  PENDING: {
    label: "Não executado",
    icon: Clock,
    cardBg: "bg-slate-50",
    cardBorder: "border-slate-200",
    cardText: "text-slate-500",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-500",
    sectionBorder: "border-slate-200",
    sectionTitle: "text-slate-500",
    dot: "bg-slate-400",
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
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${cfg.cardText}`}
        >
          {cfg.label}
        </span>
        <Icon className={`h-4 w-4 ${cfg.cardText}`} aria-hidden="true" />
      </div>
      <p className={`text-3xl font-bold ${cfg.cardText}`}>{count}</p>
      <div className="space-y-1">
        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-1.5 rounded-full ${cfg.dot}`}
            style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
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
  const tc = getResultTestCase(result);

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
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-950 truncate block">
            {tc.title}
          </span>
          {result.executedAt && (
            <span className="text-xs text-slate-500">
              Executado em {fmt(result.executedAt)}
              {result.executedBy ? ` · ${result.executedBy.name}` : ""}
            </span>
          )}
        </div>
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}
          title={cfg.label}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{cfg.label}</span>
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
              <MarkdownContent
                className="text-sm text-slate-700"
                content={tc.description}
              />
            </div>
          )}

          {tc.steps && tc.steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Passos
              </p>
              <ol className="space-y-2">
                {tc.steps.map((step) => (
                  <li key={step.id} className="flex gap-3 text-sm">
                    <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {step.order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <MarkdownContent
                        className="text-slate-700"
                        content={step.description}
                      />
                      {step.expectedResult && (
                        <div className="mt-1 flex gap-1 text-xs italic text-slate-500">
                          <span className="shrink-0">Esperado:</span>
                          <MarkdownContent content={step.expectedResult} />
                        </div>
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
              <MarkdownContent
                className="text-sm text-slate-700"
                content={tc.expectedResult}
              />
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

          <ShortcutStorySection result={result} />

          {result.attachments && result.attachments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Evidências
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {result.attachments.map((attachment) => (
                  <EvidenceAttachmentCard
                    attachment={attachment}
                    key={attachment.id}
                  />
                ))}
              </div>
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
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
        title={`${cfg.label} (${results.length})`}
        type="button"
      >
        <h2
          className={`flex items-center gap-2 text-sm font-semibold ${cfg.sectionTitle}`}
        >
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="sr-only">{cfg.label}</span>
          <span className="text-slate-400 font-normal">({results.length})</span>
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
async function generatePDF(
  testRun: TestRun,
  results: TestResult[],
  token: string,
) {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;
  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(new Date());
  const footerLogoDataUrl = await loadImageDataUrl(praticaLogoUrl);

  // ── Design Tokens — cores extraídas da LoginPage / marca Pratica ──────────
  const C = {
    // Brand blues (da LoginPage: bg-[#1c4484], blue-900 = #1e3a8a, blue-800 = #1e40af)
    navy: [28, 68, 132] as [number, number, number], // #1c4484  — CTA principal
    navy900: [30, 58, 138] as [number, number, number], // blue-900
    navy800: [30, 64, 175] as [number, number, number], // blue-800
    navyLight: [219, 234, 254] as [number, number, number], // blue-100
    navySubtle: [239, 246, 255] as [number, number, number], // blue-50

    // Brand accent — verde-lima do ícone ShieldCheck (#ADFF2F)
    lime: [173, 255, 47] as [number, number, number], // #ADFF2F
    limeDark: [101, 163, 13] as [number, number, number], // lime-600 (texto legível)
    limeBg: [236, 252, 203] as [number, number, number], // lime-100

    // Status
    passed: [5, 150, 105] as [number, number, number], // emerald-600
    passedBg: [209, 250, 229] as [number, number, number],
    failed: [220, 38, 38] as [number, number, number], // red-600
    failedBg: [254, 226, 226] as [number, number, number],
    skipped: [241, 185, 56] as [number, number, number], // amber-700
    skippedBg: [255, 238, 140] as [number, number, number],
    pending: [100, 116, 139] as [number, number, number], // slate-500
    pendingBg: [241, 245, 249] as [number, number, number],

    // Neutrals
    text: [15, 23, 42] as [number, number, number], // slate-900
    textSub: [71, 85, 105] as [number, number, number], // slate-500
    textMuted: [148, 163, 184] as [number, number, number], // slate-400
    border: [226, 232, 240] as [number, number, number], // slate-200
    surface: [248, 250, 252] as [number, number, number], // slate-50
    white: [255, 255, 255] as [number, number, number],
  };

  const STATUS_COLORS: Record<
    StatusGroup,
    {
      fg: [number, number, number];
      bg: [number, number, number];
      bar: [number, number, number];
    }
  > = {
    PASSED: { fg: C.passed, bg: C.passedBg, bar: C.passed },
    FAILED: { fg: C.failed, bg: C.failedBg, bar: C.failed },
    SKIPPED: { fg: C.skipped, bg: C.skippedBg, bar: C.skipped },
    PENDING: { fg: C.pending, bg: C.pendingBg, bar: C.pending },
  };

  const STATUS_LABELS: Record<StatusGroup, string> = {
    PASSED: "Aprovado",
    FAILED: "Falhou",
    SKIPPED: "Ignorado",
    PENDING: "Não executado",
  };

  const ORDER: StatusGroup[] = ["FAILED", "PASSED", "SKIPPED", "PENDING"];

  // ── Utilidades ────────────────────────────────────────────────────────────
  function sf(
    style: "bold" | "normal" | "italic",
    size: number,
    color: [number, number, number] = C.text,
  ) {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  }

  function fr(
    x: number,
    yy: number,
    w: number,
    h: number,
    color: [number, number, number],
    r = 0,
  ) {
    doc.setFillColor(...color);
    if (r > 0) {
      doc.roundedRect(x, yy, w, h, r, r, "F");
    } else {
      doc.rect(x, yy, w, h, "F");
    }
  }

  function sr(
    x: number,
    yy: number,
    w: number,
    h: number,
    color: [number, number, number],
    lw = 0.25,
    r = 0,
  ) {
    doc.setDrawColor(...color);
    doc.setLineWidth(lw);
    if (r > 0) {
      doc.roundedRect(x, yy, w, h, r, r, "S");
    } else {
      doc.rect(x, yy, w, h, "S");
    }
  }

  // Coordenadas dos cards e destinos usados pelas anotações internas do PDF.
  const sectionAnchors: Record<StatusGroup, PdfPosition | null> = {
    FAILED: null,
    PASSED: null,
    SKIPPED: null,
    PENDING: null,
  };
  const kpiLinkAreas: Partial<Record<StatusGroup, PdfLinkArea>> = {};

  // ── Paginação ─────────────────────────────────────────────────────────────
  let pageNum = 1;

  function drawFooter() {
    const fy = pageH - 6;
    sf("normal", 7, C.textMuted);
    doc.text(`Gerado em ${generatedAt}`, margin, fy);
    doc.text(`Página ${pageNum}`, pageW - margin, fy, { align: "right" });

    if (footerLogoDataUrl) {
      try {
        const lw = 22,
          lh = 6;
        doc.addImage(
          footerLogoDataUrl,
          "PNG",
          (pageW - lw) / 2,
          fy - lh + 1,
          lw,
          lh,
        );
      } catch {
        /* continua sem logo */
      }
    }

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.line(margin, fy - 8, pageW - margin, fy - 8);
    pageNum++;
  }

  function drawPageHeader() {
    // Stripe dupla: navy + lime
    fr(0, 0, pageW, 2, C.navy);
    fr(0, 2, pageW, 1, C.lime);
  }

  function checkPage(needed: number) {
    if (shouldStartNewPdfPage(y, needed, pageH - margin - 8)) {
      drawFooter();
      doc.addPage();
      y = margin;
      drawPageHeader();
      return true;
    }

    return false;
  }

  // ── CAPA ──────────────────────────────────────────────────────────────────

  // Fundo navy
  fr(0, 0, pageW, 80, C.navy900);

  // Acento lime no canto superior direito (eco do ShieldCheck da login)
  fr(pageW - 50, -8, 58, 58, C.navy800, 8);
  fr(pageW - 36, -6, 42, 42, C.navy, 6);
  // Triângulo lime no canto — quadrado pequeno rotacionado visualmente por sobreposição

  // Stripe lime horizontal no rodapé do hero
  fr(0, 78, pageW, 3, C.lime);
  fr(0, 77, pageW, 1.5, C.limeBg); // suaviza a transição

  // Título
  sf("bold", 24, C.white);
  doc.text("Relatório de", margin, 28);
  sf("bold", 24, C.lime);
  doc.text("Execução", margin, 40);

  // Linha divisória branca
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(margin, 45, margin + 55, 45);

  // Nome do test run
  sf("normal", 10, C.navyLight);
  const nameLines = doc.splitTextToSize(testRun.name, contentW - 24);
  doc.text(nameLines.slice(0, 2), margin, 53);

  // Data geração
  sf("normal", 7.5, C.navyLight);
  doc.text(`Gerado em ${generatedAt}`, margin, 72);

  y = 92;

  // ── INFORMAÇÕES GERAIS ────────────────────────────────────────────────────
  sf("bold", 9, C.navy);
  doc.text("INFORMAÇÕES GERAIS", margin, y);

  y += 8;

  const suiteTypes = [
    ...new Set((testRun.suites ?? []).map((s) => s.testType).filter(Boolean)),
  ];
  const typeLabel =
    suiteTypes.length > 0
      ? suiteTypes.map((t) => testTypeLabel(t)).join(", ")
      : "—";

  const infoRows: [string, string][] = [
    ["Projeto", testRun.project?.name ?? "—"],
    [
      "Plano de Teste",
      testRun.testPlan
        ? `${testRun.testPlan.name} v${testRun.testPlan.version}`
        : "—",
    ],
    ["Tipo de Teste", typeLabel],
    ["Status", testRunStatusLabel(testRun.status)],
    ["Responsável", testRun.assignedTo?.name ?? "—"],
    ["Início", fmt(testRun.startedAt)],
    ["Conclusão", fmt(testRun.completedAt)],
    ["Última atualização", fmt(testRun.updatedAt)],
  ];

  const colW = (contentW - 6) / 2;
  infoRows.forEach(([label, value], i) => {
    const col = i % 2;
    if (col === 0) {
      checkPage(12);
      if (Math.floor(i / 2) % 2 === 0)
        fr(margin, y - 4, contentW, 10, C.surface);
    }
    const x = margin + col * (colW + 6);
    sf("bold", 6.5, C.textMuted);
    doc.text(label.toUpperCase(), x, y);
    sf("normal", 8.5, C.text);
    doc.text(String(value), x, y + 4.5);
    if (col === 1) y += 11;
  });
  if (infoRows.length % 2 !== 0) y += 11;

  y += 10;

  // ── RESUMO DE EXECUÇÃO ────────────────────────────────────────────────────
  checkPage(70);
  sf("bold", 9, C.navy);
  doc.text("RESUMO DE EXECUÇÃO", margin, y);
  y += 8;

  const summary = summarizeTestResults(results);
  const { failed, notRun, passed, skipped, total } = summary;

  // KPI cards — 4 colunas
  const kpiItems = [
    { label: "Aprovados", value: passed, status: "PASSED" as StatusGroup },
    { label: "Falhas", value: failed, status: "FAILED" as StatusGroup },
    { label: "Ignorados", value: skipped, status: "SKIPPED" as StatusGroup },
    {
      label: "Não executados",
      value: notRun,
      status: "PENDING" as StatusGroup,
    },
  ];

  const cardW = (contentW - 9) / 4;
  const cardH = 30;

  checkPage(cardH + 4);
  kpiItems.forEach((item, i) => {
    const sc = STATUS_COLORS[item.status];
    const cx = margin + i * (cardW + 3);

    if (item.value > 0) {
      kpiLinkAreas[item.status] = {
        h: cardH,
        page: doc.getNumberOfPages(),
        w: cardW,
        x: cx,
        y,
      };
    }

    // Sombra simulada (retângulo deslocado levemente)
    fr(cx + 1, y + 1, cardW, cardH, C.border, 3);

    // Card body
    fr(cx, y, cardW, cardH, C.white, 3);
    sr(cx, y, cardW, cardH, C.border, 0.25, 3);

    // Barra superior colorida (3mm) com lime como highlight da marca
    fr(cx, y, cardW, 3.5, sc.bar, 3);
    fr(cx, y + 2, cardW, 1.5, sc.bar); // cobre o radius inferior da barra

    // Número grande
    sf("bold", 20, sc.fg);
    doc.text(String(item.value), cx + cardW / 2, y + 18, { align: "center" });

    // Label
    sf("normal", 6.5, C.textSub);
    doc.text(item.label.toUpperCase(), cx + cardW / 2, y + 25, {
      align: "center",
    });

    if (item.value > 0) {
      // Indicador visual discreto de que o card leva à seção correspondente.
      sf("normal", 6, sc.fg);
      doc.text("↓", cx + cardW - 5, y + cardH - 3);
      const labelWidth = doc.getTextWidth(item.label.toUpperCase());
      doc.setDrawColor(...sc.fg);
      doc.setLineWidth(0.15);
      doc.line(
        cx + (cardW - labelWidth) / 2,
        y + 26,
        cx + (cardW + labelWidth) / 2,
        y + 26,
      );
    }
  });

  y += cardH + 10;

  const barH = 5;

  // desenha apenas os segmentos coloridos (sem track/borda)
  const inset = 1.2; // horizontal inset to keep segments from touching page edges
  const innerY = y + 0.6; // slight vertical inset
  const innerH = Math.max(1, barH - 1.2);
  let bx = margin + inset;
  const segAvailableW = Math.max(0, contentW - inset * 2);

  [
    { count: passed, color: C.passed },
    { count: failed, color: C.failed },
    { count: skipped, color: C.skipped },
  ].forEach(({ count, color }) => {
    if (!total || !count) return;
    const w = (count / total) * segAvailableW;
    fr(bx, innerY, w, innerH, color);
    bx += w;
  });

  // sem borda externa — apenas segmentos coloridos
  y += barH + 5;

  // ── PÁGINAS DE TEST CASES ─────────────────────────────────────────────────
  let embeddedEvidenceCount = 0;
  let figureNumber = 1;

  if (results.length > 0) {
    drawFooter();
    doc.addPage();
    drawPageHeader();
    y = margin + 6;

    for (const status of ORDER) {
      const group = results.filter((r) => r.status === status);
      if (group.length === 0) continue;

      const sc = STATUS_COLORS[status];

      checkPage(22);

      // Registra âncora da seção
      sectionAnchors[status] = { page: pageNum, y };

      // Cabeçalho de seção — fundo colorido + stripe navy à esquerda
      fr(margin, y - 1, contentW, 12, sc.bg, 3);
      fr(margin, y - 1, 4, 12, sc.bar, 2);
      // Stripe lime no topo do header de seção

      sf("bold", 9.5, sc.fg);
      doc.text(
        `${STATUS_LABELS[status].toUpperCase()}  ·  ${group.length} caso${group.length !== 1 ? "s" : ""}`,
        margin + 8,
        y + 7,
      );

      // Badge de porcentagem no canto direito do header
      const pct = total > 0 ? Math.round((group.length / total) * 100) : 0;
      sf("bold", 7.5, sc.fg);
      doc.text(`${pct}%`, pageW - margin - 4, y + 7, { align: "right" });

      y += 16;

      for (const result of group) {
        const tc = getResultTestCase(result);
        const hasDesc = Boolean(tc.description);
        const hasExpected = Boolean(tc.expectedResult);
        const hasComment = Boolean(result.comment);
        const attachments = orderPdfEvidenceAttachments(
          result.attachments ?? [],
        );

        const titleLines = doc.splitTextToSize(
          tc.title || "Sem título",
          contentW - 52,
        );
        const titleLineCount = Math.min(titleLines.length, 2);

        const measureBlock = (text: string, maxL = 2) =>
          Math.min(doc.splitTextToSize(text, contentW - 20).length, maxL) * 4.5;
        const measureField = (text: string) => 4 + measureBlock(text) + 3;
        const stepsH = (tc.steps ?? []).reduce(
          (h, step) =>
            h + measureBlock(`${step.order}. ${step.description}`) + 1,
          0,
        );
        const estimatedH =
          8 +
          (titleLineCount > 1 ? 11 : 6) +
          (result.executedAt || result.executedBy ? 5 : 0) +
          6 + // divider
          (hasDesc ? measureField(tc.description ?? "") : 0) +
          (hasExpected ? measureField(tc.expectedResult ?? "") : 0) +
          (hasComment ? measureField(result.comment ?? "") : 0) +
          (stepsH > 0 ? 4 + stepsH + 2 : 0) +
          6;

        checkPage(estimatedH + 4);

        const cardX = margin;
        const cardY = y;

        // Sombra simulada
        fr(cardX + 1, cardY + 1, contentW, estimatedH, C.border, 3);

        // Card
        fr(cardX, cardY, contentW, estimatedH, C.white, 3);
        sr(cardX, cardY, contentW, estimatedH, C.border, 0.25, 3);

        // Stripe esquerda colorida de status
        fr(cardX, cardY, 4, estimatedH, sc.bar, 2);
        fr(cardX + 2, cardY, 2, estimatedH, sc.bar);

        const cx = cardX + 10;
        let cy = cardY + 8;

        // Título
        sf("bold", 9.5, C.text);
        doc.text(titleLines.slice(0, titleLineCount), cx, cy);
        cy += titleLineCount > 1 ? 11 : 6;

        // Meta: executor + data
        if (result.executedAt || result.executedBy) {
          const meta = [
            result.executedBy?.name,
            result.executedAt ? fmt(result.executedAt) : null,
          ]
            .filter(Boolean)
            .join("  ·  ");
          sf("normal", 7, C.textMuted);
          doc.text(meta, cx, cy);
          cy += 5;
        }

        // Badge status (canto superior direito)
        const badgeW = 26;
        const badgeX = cardX + contentW - badgeW - 6;
        const badgeY = cardY + 5;
        fr(badgeX, badgeY, badgeW, 8, sc.bg, 2);
        sr(badgeX, badgeY, badgeW, 8, sc.bar, 0.4, 2);
        sf("bold", 6.5, sc.fg);
        doc.text(
          STATUS_LABELS[status].toUpperCase(),
          badgeX + badgeW / 2,
          badgeY + 5,
          { align: "center" },
        );

        // Divisor
        cy += 2;
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        doc.line(cx, cy, cardX + contentW - 6, cy);
        cy += 5;

        // Campos
        function drawField(label: string, text: string, maxLines = 2) {
          sf("bold", 6.5, C.navy);
          doc.text(label.toUpperCase(), cx, cy);
          cy += 4;
          sf("normal", 8, C.text);
          const lines = doc.splitTextToSize(text, contentW - 20);
          doc.text(lines.slice(0, maxLines), cx + 2, cy);
          cy += Math.min(lines.length, maxLines) * 4.5 + 3;
        }

        if (hasDesc) drawField("Descrição", tc.description ?? "");
        if (hasExpected)
          drawField("Resultado Esperado", tc.expectedResult ?? "");
        if (hasComment) drawField("Observações", result.comment ?? "");

        if ((tc.steps?.length ?? 0) > 0) {
          sf("bold", 6.5, C.navy);
          doc.text("STEPS", cx, cy);
          cy += 4;
          tc.steps?.forEach((step) => {
            sf("normal", 8, C.text);
            const sLines = doc.splitTextToSize(
              `${step.order}. ${step.description}`,
              contentW - 22,
            );
            doc.text(sLines.slice(0, 2), cx + 2, cy);
            cy += Math.min(sLines.length, 2) * 4.5 + 1;
          });
          cy += 2;
        }

        y += Math.max(estimatedH, cy - cardY + 6) + 4;

        if (attachments.length > 0) {
          checkPage(12);
          sf("bold", 6.5, C.navy);
          doc.text("EVIDÊNCIAS", margin + 6, y);
          y += 7;

          for (const attachment of attachments) {
            const attachmentName = getAttachmentName(attachment);

            if (!isImageAttachment(attachment)) {
              checkPage(12);
              sf("bold", 7.5, C.textSub);
              doc.text("Anexo não exibido no relatório:", margin + 8, y);
              y += 4;
              sf("normal", 7.5, C.textMuted);
              const attachmentLines = doc.splitTextToSize(
                `${attachmentName} — ${getAttachmentTypeLabel(attachment)} — ${formatAttachmentSize(attachment.size)}`,
                contentW - 16,
              );
              doc.text(attachmentLines.slice(0, 2), margin + 8, y);
              y += Math.min(attachmentLines.length, 2) * 4 + 5;
              continue;
            }

            if (
              !canEmbedMorePdfEvidence(
                embeddedEvidenceCount,
                PDF_EVIDENCE_MAX_COUNT,
              )
            ) {
              checkPage(10);
              sf("normal", 7.5, C.textMuted);
              doc.text(
                `Imagem não incorporada por limite do relatório: ${attachmentName}`,
                margin + 8,
                y,
              );
              y += 7;
              continue;
            }

            try {
              const evidenceImage = await preparePdfEvidenceImage((signal) =>
                testResultsApi.getAttachmentPdfImageBlob(
                  token,
                  attachment.id,
                  signal,
                ),
              );
              const placement = calculatePdfImagePlacement(
                evidenceImage.width,
                evidenceImage.height,
                contentW - 16,
              );
              const caption = `Figura ${figureNumber} — ${attachmentName}`;
              const captionLines = doc.splitTextToSize(caption, contentW - 16);
              const blockHeight =
                placement.height + Math.min(captionLines.length, 2) * 4 + 9;
              const startedNewPage = checkPage(blockHeight);

              if (startedNewPage) {
                sf("bold", 6.5, C.navy);
                const continuation = doc.splitTextToSize(
                  `EVIDÊNCIAS — ${tc.title}`,
                  contentW - 12,
                );
                doc.text(continuation.slice(0, 1), margin + 6, y);
                y += 7;
              }

              const imageX = margin + (contentW - placement.width) / 2;
              sr(
                imageX - 1,
                y - 1,
                placement.width + 2,
                placement.height + 2,
                C.border,
              );
              doc.addImage(
                evidenceImage.dataUrl,
                "JPEG",
                imageX,
                y,
                placement.width,
                placement.height,
                undefined,
                "MEDIUM",
              );
              y += placement.height + 5;
              sf("italic", 7.5, C.textSub);
              doc.text(captionLines.slice(0, 2), pageW / 2, y, {
                align: "center",
              });
              y += Math.min(captionLines.length, 2) * 4 + 5;
              embeddedEvidenceCount += 1;
              figureNumber += 1;
            } catch (evidenceError) {
              console.warn("Falha ao incorporar evidência no PDF", {
                attachmentId: attachment.id,
                fileName: attachmentName,
                testCaseId: result.testCaseId,
                reason:
                  evidenceError instanceof Error
                    ? evidenceError.message
                    : "Erro desconhecido",
              });
              checkPage(10);
              sf("normal", 7.5, C.failed);
              const failureLines = doc.splitTextToSize(
                `Não foi possível carregar a evidência: ${attachmentName}`,
                contentW - 16,
              );
              doc.text(failureLines.slice(0, 2), margin + 8, y);
              y += Math.min(failureLines.length, 2) * 4 + 5;
            }
          }

          y += 3;
        }
      }

      y += 8;
    }
  }

  drawFooter();

  const internalLinks = buildPdfInternalLinks(
    ORDER,
    summary.byStatus,
    kpiLinkAreas,
    sectionAnchors,
  );
  applyPdfInternalLinks(doc, internalLinks);

  // ── Salvar ────────────────────────────────────────────────────────────────
  const safeName =
    testRun.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "test_run";

  doc.save(`relatorio_${safeName}.pdf`);
  return doc;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TestRunReportPage({
  testRunId,
  onBack,
  onEditResults,
}: TestRunReportPageProps) {
  const { token } = useAuth();
  const { report, isLoading, error, refetch } = useTestRunReport(testRunId);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const latestReport = await refetch();

      if (latestReport && token) {
        await generatePDF(latestReport.testRun, latestReport.results, token);
      }
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setIsExporting(false);
    }
  }, [refetch, token]);

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
          {error || "Relatório não encontrado."}
        </div>
      </div>
    );
  }

  const { testRun, results, summary } = report;
  const suiteTypes = [
    ...new Set((testRun.suites ?? []).map((s) => s.testType).filter(Boolean)),
  ];

  const grouped: Record<StatusGroup, TestResult[]> = {
    FAILED: results.filter((r) => r.status === "FAILED"),
    PASSED: results.filter((r) => r.status === "PASSED"),
    SKIPPED: results.filter((r) => r.status === "SKIPPED"),
    PENDING: results.filter((r) => r.status === "PENDING"),
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
          {onEditResults ? (
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 hover:bg-blue-100"
              onClick={() => onEditResults(testRun)}
              type="button"
            >
              <Pencil className="h-4 w-4" />
              Editar resultados
            </button>
          ) : null}

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
            {isExporting ? "Gerando PDF…" : "Baixar relatório em PDF"}
          </button>
        </div>
      </div>

      {/* Header info */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">
            Informações da execução
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
          {[
            {
              icon: Tag,
              label: "Projeto",
              value: testRun.project?.name ?? "—",
            },
            {
              icon: FileText,
              label: "Plano de Teste",
              value: testRun.testPlan
                ? `${testRun.testPlan.name} v${testRun.testPlan.version}`
                : "—",
            },
            {
              icon: Tag,
              label: "Tipo de Teste",
              value:
                suiteTypes.length > 0
                  ? suiteTypes.map((t) => testTypeLabel(t)).join(", ")
                  : "—",
            },
            {
              icon: User,
              label: "Responsável",
              value: testRun.assignedTo?.name ?? "—",
            },
            {
              icon: Calendar,
              label: "Início",
              value: fmtDate(testRun.startedAt),
            },
            {
              icon: Calendar,
              label: "Conclusão",
              value: fmtDate(testRun.completedAt),
            },
            {
              icon: Clock,
              label: "Última Atualização",
              value: fmt(testRun.updatedAt),
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                <Icon className="h-3 w-3" aria-hidden="true" />
                {label}
              </p>
              <p className="text-sm font-medium text-slate-950 truncate">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          status="PASSED"
          count={summary.passed}
          total={summary.total}
        />
        <SummaryCard
          status="FAILED"
          count={summary.failed}
          total={summary.total}
        />
        <SummaryCard
          status="SKIPPED"
          count={summary.skipped}
          total={summary.total}
        />
        <SummaryCard
          status="PENDING"
          count={summary.notRun}
          total={summary.total}
        />
      </div>

      {/* Progress bar */}
      {summary.total > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Progresso geral</span>
            <span>
              {summary.executed} / {summary.total} executados (
              {summary.progressPercentage}%) · Aprovação{" "}
              {summary.approvalPercentage}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden bg-slate-100 flex">
            {[
              { count: summary.passed, color: "bg-emerald-600" },
              { count: summary.failed, color: "bg-red-600" },
              { count: summary.skipped, color: "bg-amber-400" },
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
              {
                label: "Aprovados",
                count: summary.passed,
                dot: "bg-emerald-600",
              },
              { label: "Falhas", count: summary.failed, dot: "bg-red-600" },
              {
                label: "Ignorados",
                count: summary.skipped,
                dot: "bg-amber-400",
              },
              {
                label: "Não executados",
                count: summary.notRun,
                dot: "bg-slate-400",
              },
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
            Esta execução ainda não possui resultados registrados.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(["FAILED", "PASSED", "SKIPPED", "PENDING"] as StatusGroup[]).map(
            (status) => (
              <StatusSection
                key={status}
                status={status}
                results={grouped[status]}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

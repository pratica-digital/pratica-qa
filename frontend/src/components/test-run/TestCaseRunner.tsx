import { useState } from 'react';
import {
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FileVideo,
  History,
  Image,
  ListChecks,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import { TestResultStatusBadge } from '../badges';
import { resolveApiAssetUrl } from '../../lib/api';
import { testResultStatusLabel } from '../../lib/labels';
import type { ExecuteTestResultPayload, TestResult, TestResultAttachment, TestResultStatus } from '../../types/testRun';
import { TestResultForm } from './TestResultForm';

type TestCaseRunnerProps = {
  result: TestResult;
  disabled: boolean;
  disabledReason?: string;
  isActive: boolean;
  isSubmitting: boolean;
  onActivate: () => void;
  onRemoveAttachment: (result: TestResult, attachment: TestResultAttachment) => Promise<void>;
  onSubmit: (result: TestResult, payload: ExecuteTestResultPayload) => Promise<void>;
  onUploadAttachments: (result: TestResult, files: File[]) => Promise<void>;
};

function formatDate(value?: string | null) {
  if (!value) {
    return 'Não executado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getAttachmentUrl(attachment: TestResultAttachment) {
  return attachment.url;
}

function getAttachmentName(attachment: TestResultAttachment) {
  return (
    attachment.originalName ||
    attachment.fileName ||
    decodeURIComponent(getAttachmentUrl(attachment).split('/').pop() ?? 'Evidência')
  );
}

function isImageAttachment(attachment: TestResultAttachment) {
  return (
    attachment.mimeType.startsWith('image/') ||
    /\.(gif|jpe?g|png|webp)$/i.test(getAttachmentUrl(attachment).split('?')[0] ?? '')
  );
}

function isVideoAttachment(attachment: TestResultAttachment) {
  return (
    attachment.mimeType.startsWith('video/') ||
    /\.(mp4|mov|webm)$/i.test(getAttachmentUrl(attachment).split('?')[0] ?? '')
  );
}

function formatUploadDate(value?: string | null) {
  if (!value) {
    return 'Data pendente';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusLabel(status?: TestResultStatus | null) {
  return testResultStatusLabel(status);
}

export function TestCaseRunner({
  result,
  disabled,
  disabledReason,
  isActive,
  isSubmitting,
  onActivate,
  onRemoveAttachment,
  onSubmit,
  onUploadAttachments,
}: TestCaseRunnerProps) {
  const [previewAttachment, setPreviewAttachment] = useState<TestResultAttachment | null>(null);
  const { testCase } = result;
  const steps = testCase.steps ?? [];
  const attachments = result.attachments ?? [];
  const history = result.history ?? [];
  const projectName =
    testCase.suite?.project?.name ??
    result.testRun?.project?.name ??
    result.testRun?.projectId ??
    'Projeto';
  const suiteName = testCase.suite?.name ?? 'Suíte não atribuída';
  const isCriticalFailure =
    result.status === 'FAILED' && (testCase.severity === 'CRITICAL' || testCase.severity === 'HIGH');

  return (
    <article
      className={`rounded-lg border bg-white shadow-sm outline-none transition ${
        isActive
          ? 'border-slate-950 ring-2 ring-slate-200'
          : 'border-slate-200'
      }`}
      onClick={onActivate}
      onFocus={onActivate}
      tabIndex={0}
    >
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500">
                <ListChecks className="h-3 w-3" aria-hidden="true" />
                {projectName} / {suiteName}
              </span>
              <TestResultStatusBadge status={result.status} />
              {isCriticalFailure ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                  <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                  Falha crítica
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-base font-semibold tracking-normal text-slate-950">
              {testCase.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {testCase.description || 'Nenhuma descrição registrada para este caso.'}
            </p>
          </div>

          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-72 lg:grid-cols-1">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>{result.executedBy?.name ?? 'Sem executor ainda'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>{formatDate(result.executedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>
                {result.lastModifiedBy?.name
                  ? `Editado por ${result.lastModifiedBy.name}`
                  : `Atualizado em ${formatDate(result.updatedAt)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <section>
            <h3 className="text-xs font-medium uppercase text-slate-500">Passos</h3>
            {steps.length > 0 ? (
              <ol className="mt-3 space-y-3">
                {steps.map((step) => (
                  <li className="flex gap-3" key={step.id}>
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
                      {step.order}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">{step.description}</p>
                      {step.expectedResult ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Esperado: {step.expectedResult}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Nenhum detalhe de passo disponível para este caso.
              </p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-medium uppercase text-slate-500">
              Resultado esperado
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              {testCase.expectedResult || 'Use os resultados esperados dos passos para verificação.'}
            </p>
          </section>

          {result.comment ? (
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                Último comentário
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {result.comment}
              </p>
            </section>
          ) : null}

          {attachments.length > 0 ? (
            <section>
              <h3 className="text-xs font-medium uppercase text-slate-500">
                Evidências
              </h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {attachments.map((attachment) => (
                  <div
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                    key={attachment.id}
                  >
                    {isImageAttachment(attachment) ? (
                      <button
                        className="block aspect-video w-full bg-slate-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreviewAttachment(attachment);
                        }}
                        type="button"
                      >
                        <img
                          alt={getAttachmentName(attachment)}
                          className="h-full w-full object-cover"
                          src={resolveApiAssetUrl(getAttachmentUrl(attachment))}
                        />
                      </button>
                    ) : isVideoAttachment(attachment) ? (
                      <div className="bg-slate-950" onClick={(event) => event.stopPropagation()}>
                        <video
                          className="aspect-video w-full bg-slate-950"
                          controls
                          preload="metadata"
                          src={resolveApiAssetUrl(getAttachmentUrl(attachment))}
                        >
                          <a
                            className="text-white underline"
                            href={resolveApiAssetUrl(getAttachmentUrl(attachment))}
                          >
                            {getAttachmentName(attachment)}
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
                          {getAttachmentName(attachment)}
                        </span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {formatUploadDate(attachment.createdAt)}
                          {attachment.uploadedBy?.name ? ` por ${attachment.uploadedBy.name}` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {isVideoAttachment(attachment) ? (
                          <FileVideo className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        ) : null}
                        <a
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          href={resolveApiAssetUrl(getAttachmentUrl(attachment))}
                          onClick={(event) => event.stopPropagation()}
                          rel="noreferrer"
                          target="_blank"
                          title="Abrir evidência"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                        <a
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          download={getAttachmentName(attachment)}
                          href={resolveApiAssetUrl(getAttachmentUrl(attachment))}
                          onClick={(event) => event.stopPropagation()}
                          title="Baixar evidência"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {history.length > 0 ? (
            <section>
              <h3 className="text-xs font-medium uppercase text-slate-500">
                Histórico de alterações
              </h3>
              <div className="mt-2 space-y-2">
                {history.slice(0, 5).map((entry) => (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2" key={entry.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-700">
                        {getStatusLabel(entry.previousStatus)} {'->'} {getStatusLabel(entry.newStatus)}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(entry.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.actor?.name ?? 'Sistema'}
                      {entry.addedAttachments?.length
                        ? ` adicionou ${entry.addedAttachments.length} arquivo(s) de evidência`
                        : ''}
                      {entry.removedAttachments?.length
                        ? ` removeu ${entry.removedAttachments.length} arquivo(s) de evidência`
                        : ''}
                    </p>
                    {entry.newComment && entry.newComment !== entry.previousComment ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{entry.newComment}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {disabled && disabledReason ? (
            <p className="rounded-md border border-amber-200 bg-amber-100 px-3 py-2 text-sm text-amber-800">
              {disabledReason}
            </p>
          ) : null}
          <TestResultForm
            attachments={result.attachments}
            comment={result.comment}
            currentStatus={result.status}
            disabled={disabled}
            isActive={isActive}
            isSubmitting={isSubmitting}
            key={`${result.id}-${result.comment ?? ''}`}
            onRemoveAttachment={(attachment) => onRemoveAttachment(result, attachment)}
            onSubmit={(payload) => onSubmit(result, payload)}
            onUploadAttachments={(files) => onUploadAttachments(result, files)}
          />
        </aside>
      </div>

      {previewAttachment ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={(event) => {
            event.stopPropagation();
            setPreviewAttachment(null);
          }}
        >
          <div className="max-h-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
              <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
                <Image className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{getAttachmentName(previewAttachment)}</span>
              </span>
              <button
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setPreviewAttachment(null)}
                title="Fechar pré-visualização"
                type="button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <img
              alt={getAttachmentName(previewAttachment)}
              className="max-h-[80vh] max-w-full object-contain"
              src={resolveApiAssetUrl(getAttachmentUrl(previewAttachment))}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

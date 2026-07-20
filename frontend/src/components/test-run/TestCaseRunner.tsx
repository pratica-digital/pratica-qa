import { useState, type ReactNode } from 'react';
import {
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FileVideo,
  History,
  Image,
  ListChecks,
  Pencil,
  ShieldAlert,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { ActionMenu } from '../ActionMenu';
import { TestResultStatusBadge } from '../badges';
import { useAuthenticatedAttachmentUrl } from '../../hooks/useAuthenticatedAttachmentUrl';
import {
  getAttachmentName,
  isImageAttachment,
  isVideoAttachment,
} from '../../lib/attachments';
import { getResultTestCase } from '../../lib/testResultOverrides';
import { suiteProjectLabel } from '../../lib/labels';
import type { AuthUser, ExecuteTestResultPayload, TestResult, TestResultAttachment } from '../../types/testRun';
import { TestResultForm } from './TestResultForm';

type TestCaseRunnerProps = {
  result: TestResult;
  runAssignee?: AuthUser;
  draftComment?: string;
  position: number;
  total: number;
  isLast: boolean;
  disabled: boolean;
  disabledReason?: string;
  isActive: boolean;
  isSubmitting: boolean;
  onActivate: () => void;
  onEditRunCase: (result: TestResult) => void;
  onNext: (
    result: TestResult,
    payload: ExecuteTestResultPayload,
    hasDraftChanges: boolean,
  ) => Promise<void>;
  onDraftCommentChange: (resultId: string, value: string) => void;
  onOpenList: () => void;
  onRemoveRunCase: (result: TestResult) => void;
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

function formatUploadDate(value?: string | null) {
  if (!value) {
    return 'Data pendente';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'a, button, input, label, select, textarea, video, [contenteditable="true"], [role="button"]',
    ),
  );
}

function AuthenticatedAttachmentAsset({
  attachment,
  children,
}: {
  attachment: TestResultAttachment;
  children: (url: string) => ReactNode;
}) {
  return children(useAuthenticatedAttachmentUrl(attachment.id));
}

export function TestCaseRunner({
  result,
  runAssignee,
  draftComment,
  position,
  total,
  isLast,
  disabled,
  disabledReason,
  isActive,
  isSubmitting,
  onActivate,
  onEditRunCase,
  onNext,
  onDraftCommentChange,
  onOpenList,
  onRemoveRunCase,
  onRemoveAttachment,
  onSubmit,
  onUploadAttachments,
}: TestCaseRunnerProps) {
  const [previewAttachment, setPreviewAttachment] = useState<TestResultAttachment | null>(null);
  const testCase = getResultTestCase(result);
  const steps = testCase.steps ?? [];
  const attachments = result.attachments ?? [];
  const projectName =
    result.testRun?.project?.name ??
    result.testRun?.projectId ??
    suiteProjectLabel(testCase.suite ?? {});
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
      onClick={(event) => {
        if (isInteractiveTarget(event.target)) {
          return;
        }

        onActivate();
      }}
      onFocus={(event) => {
        if (isInteractiveTarget(event.target)) {
          return;
        }

        onActivate();
      }}
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
              <ActionMenu
                ariaLabel="Ações do caso nesta execução"
                disabled={disabled}
                items={[
                  {
                    icon: <Pencil className="h-4 w-4" aria-hidden="true" />,
                    label: 'Editar neste run',
                    onSelect: () => onEditRunCase(result),
                  },
                  {
                    icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                    label: 'Remover deste run',
                    onSelect: () => onRemoveRunCase(result),
                    tone: 'danger',
                  },
                ]}
              />
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
              <span>
                {result.status === 'PENDING'
                  ? runAssignee?.name ?? 'Sem executor ainda'
                  : result.executedBy?.name ?? 'Sem executor ainda'}
              </span>
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

      <div className="p-4">
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

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            {disabled && disabledReason ? (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-100 px-3 py-2 text-sm text-amber-800">
                {disabledReason}
              </p>
            ) : null}
            <TestResultForm
              attachments={result.attachments}
              comment={result.comment}
              currentStatus={result.status}
              draftComment={draftComment}
              disabled={disabled}
              isActive={isActive}
              isLastResult={isLast}
              isSubmitting={isSubmitting}
              key={`${result.id}-${result.comment ?? ''}`}
              navigationPosition={position}
              navigationTotal={total}
              onNext={(payload, hasDraftChanges) => onNext(result, payload, hasDraftChanges)}
              onDraftCommentChange={(value) => onDraftCommentChange(result.id, value)}
              onOpenList={onOpenList}
              onRemoveAttachment={(attachment) => onRemoveAttachment(result, attachment)}
              onSubmit={(payload) => onSubmit(result, payload)}
              onUploadAttachments={(files) => onUploadAttachments(result, files)}
            />
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
                  <AuthenticatedAttachmentAsset attachment={attachment} key={attachment.id}>
                    {(assetUrl) => <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                          src={assetUrl}
                        />
                      </button>
                    ) : isVideoAttachment(attachment) ? (
                      <div className="bg-slate-950" onClick={(event) => event.stopPropagation()}>
                        <video
                          className="aspect-video w-full bg-slate-950"
                          controls
                          preload="metadata"
                          src={assetUrl}
                        >
                          <a
                            className="text-white underline"
                            href={assetUrl}
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
                          href={assetUrl}
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
                          href={assetUrl}
                          onClick={(event) => event.stopPropagation()}
                          title="Baixar evidência"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      </span>
                    </div>
                    </div>}
                  </AuthenticatedAttachmentAsset>
                ))}
              </div>
            </section>
          ) : null}

        </div>
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
            <AuthenticatedAttachmentAsset attachment={previewAttachment}>
              {(assetUrl) => assetUrl ? <img
                alt={getAttachmentName(previewAttachment)}
                className="max-h-[80vh] max-w-full object-contain"
                src={assetUrl}
              /> : null}
            </AuthenticatedAttachmentAsset>
          </div>
        </div>
      ) : null}
    </article>
  );
}

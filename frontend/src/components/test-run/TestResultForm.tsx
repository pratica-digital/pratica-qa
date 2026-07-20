import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ListChecks,
  Paperclip,
  SkipForward,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { getAttachmentName } from '../../lib/attachments';
import type {
  ExecuteTestResultPayload,
  TestResultAttachment,
  TestResultStatus,
} from '../../types/testRun';

type TestResultFormProps = {
  comment?: string;
  attachments?: TestResultAttachment[];
  currentStatus: TestResultStatus;
  draftComment?: string;
  disabled: boolean;
  isActive: boolean;
  isSubmitting: boolean;
  isLastResult?: boolean;
  navigationPosition?: number;
  navigationTotal?: number;
  onNext?: (payload: ExecuteTestResultPayload, hasDraftChanges: boolean) => Promise<void>;
  onDraftCommentChange?: (value: string) => void;
  onOpenList?: () => void;
  onRemoveAttachment: (attachment: TestResultAttachment) => Promise<void>;
  onSubmit: (payload: ExecuteTestResultPayload) => Promise<void>;
  onUploadAttachments: (files: File[]) => Promise<void>;
};

const actionConfig: Array<{
  status: TestResultStatus;
  label: string;
  title: string;
  className: string;
  activeClassName: string;
  icon: LucideIcon;
}> = [
  {
    status: 'PASSED',
    label: 'Aprovar',
    title: 'Marcar como aprovado',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    activeClassName: 'border-emerald-600 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-500',
    icon: CheckCircle2,
  },
  {
    status: 'FAILED',
    label: 'Falhar',
    title: 'Marcar como falhou',
    className:
      'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    activeClassName: 'border-red-600 bg-red-100 text-red-900 ring-1 ring-red-500',
    icon: XCircle,
  },
  {
    status: 'SKIPPED',
    label: 'Pular',
    title: 'Marcar como ignorado',
    className:
      'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    activeClassName: 'border-amber-500 bg-amber-100 text-amber-900 ring-1 ring-amber-500',
    icon: SkipForward,
  },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export function TestResultForm({
  comment = '',
  attachments = [],
  currentStatus,
  draftComment: controlledDraftComment,
  disabled,
  isActive,
  isSubmitting,
  isLastResult = false,
  navigationPosition,
  navigationTotal,
  onNext,
  onDraftCommentChange,
  onOpenList,
  onRemoveAttachment,
  onSubmit,
  onUploadAttachments,
}: TestResultFormProps) {
  const [draftComment, setDraftComment] = useState(comment);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const isBusy = isSubmitting || isUploading;
  const displayedDraftComment = controlledDraftComment ?? draftComment;
  const updateDraftComment = useCallback((value: string) => {
    if (onDraftCommentChange) {
      onDraftCommentChange(value);
      return;
    }

    setDraftComment(value);
  }, [onDraftCommentChange]);
  const normalizedDraftComment = displayedDraftComment.trim();
  const normalizedSavedComment = comment.trim();
  const hasDraftChanges = normalizedDraftComment !== normalizedSavedComment;
  const hasNavigation = Boolean(isActive && onNext && onOpenList && navigationPosition && navigationTotal);

  const uploadingAttachmentLabels = useMemo(
    () => uploadingFiles.map((file) => `${file.name} (${formatFileSize(file.size)})`),
    [uploadingFiles],
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    setUploadingFiles(files);
    setIsUploading(true);

    try {
      await onUploadAttachments(files);
    } finally {
      setUploadingFiles([]);
      setIsUploading(false);
    }
  };

  const submitStatus = useCallback(async (status: TestResultStatus) => {
    await onSubmit({
      status,
      comment: normalizedDraftComment,
    });
  }, [normalizedDraftComment, onSubmit]);

  const goToNext = useCallback(async () => {
    if (!onNext || isLastResult) {
      return;
    }

    await onNext(
      {
        status: currentStatus,
        comment: normalizedDraftComment,
      },
      hasDraftChanges,
    );
  }, [currentStatus, hasDraftChanges, isLastResult, normalizedDraftComment, onNext]);

  useEffect(() => {
    if (!isActive || disabled || isBusy) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isTypingTarget) {
        return;
      }

      const key = event.key.toLowerCase();
      const status =
        key === 'p'
          ? 'PASSED'
          : key === 'f'
            ? 'FAILED'
            : key === 's'
              ? 'SKIPPED'
              : undefined;

      if (!status) {
        return;
      }

      event.preventDefault();
      void submitStatus(status);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isActive, isBusy, submitStatus]);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium uppercase text-slate-500">
        Comentário
        <textarea
          className="mt-2 min-h-20 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          disabled={disabled || isBusy}
          onChange={(event) => updateDraftComment(event.target.value)}
          placeholder="Notas, comportamento observado ou detalhe da falha"
          value={displayedDraftComment}
        />
      </label>

      <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-600 hover:bg-slate-100 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        <span className="truncate">
          {isUploading
            ? `Enviando ${uploadingFiles.length} arquivo${uploadingFiles.length > 1 ? 's' : ''}`
            : 'Anexar mídia'}
        </span>
        <input
          className="sr-only"
          disabled={disabled || isBusy}
          multiple
          onChange={handleFileChange}
          type="file"
        />
      </label>

      {attachments.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase text-slate-500">Evidências atuais</p>
          <div className="grid gap-1.5">
            {attachments.map((attachment) => (
              <span
                className="flex min-h-8 items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                key={attachment.id}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-700">
                    {getAttachmentName(attachment)}
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {formatUploadDate(attachment.createdAt)}
                    {attachment.uploadedBy?.name ? ` por ${attachment.uploadedBy.name}` : ''}
                  </span>
                </span>
                <button
                  className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled || isBusy}
                  onClick={() => void onRemoveAttachment(attachment)}
                  title="Remover evidência"
                  type="button"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {uploadingAttachmentLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {uploadingAttachmentLabels.map((attachment) => (
            <span
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
              key={attachment}
            >
              {attachment}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {actionConfig.map((action) => {
          const Icon = action.icon;

          return (
            <button
              aria-label={action.title}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                currentStatus === action.status
                  ? action.activeClassName
                  : action.className
              }`}
              disabled={disabled || isBusy}
              key={action.status}
              onClick={() => void submitStatus(action.status)}
              title={action.title}
              type="button"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {action.label}
            </button>
          );
        })}
      </div>

      {hasNavigation ? (
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-slate-500">
            Caso {navigationPosition}/{navigationTotal}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy || isLastResult}
              onClick={() => void goToNext()}
              type="button"
            >
              {isLastResult ? 'Último caso' : 'Próximo'}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              aria-label="Abrir lista de casos de teste"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy}
              onClick={() => onOpenList?.()}
              title="Lista de casos"
              type="button"
            >
              <ListChecks className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

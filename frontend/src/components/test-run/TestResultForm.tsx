import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Paperclip, SkipForward, X, XCircle, type LucideIcon } from 'lucide-react';
import type {
  ExecuteTestResultPayload,
  TestResultAttachment,
  TestResultStatus,
} from '../../types/testRun';

type TestResultFormProps = {
  comment?: string;
  attachments?: TestResultAttachment[];
  currentStatus: TestResultStatus;
  disabled: boolean;
  isActive: boolean;
  isSubmitting: boolean;
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
    label: 'Passed',
    title: 'Mark as passed',
    className:
      'border-emerald-200 text-emerald-800 hover:bg-emerald-100',
    activeClassName: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    icon: CheckCircle2,
  },
  {
    status: 'FAILED',
    label: 'Failed',
    title: 'Mark as failed',
    className:
      'border-red-200 text-red-800 hover:bg-red-100',
    activeClassName: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
    icon: XCircle,
  },
  {
    status: 'SKIPPED',
    label: 'Skipped',
    title: 'Mark as skipped',
    className:
      'border-amber-200 text-amber-800 hover:bg-amber-100',
    activeClassName: 'border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100',
    icon: SkipForward,
  },
  {
    status: 'PENDING',
    label: 'Not Run',
    title: 'Mark as not run',
    className:
      'border-slate-200 text-slate-700 hover:bg-slate-100',
    activeClassName: 'border-slate-600 bg-slate-600 text-white hover:bg-slate-700',
    icon: Clock3,
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

function getAttachmentName(attachment: TestResultAttachment) {
  return attachment.originalName || attachment.fileName || attachment.url.split('/').pop() || 'Evidence';
}

function formatUploadDate(value?: string | null) {
  if (!value) {
    return 'Pending date';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TestResultForm({
  comment = '',
  attachments = [],
  currentStatus,
  disabled,
  isActive,
  isSubmitting,
  onRemoveAttachment,
  onSubmit,
  onUploadAttachments,
}: TestResultFormProps) {
  const [draftComment, setDraftComment] = useState(comment);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const isBusy = isSubmitting || isUploading;

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
      comment: draftComment.trim(),
    });
  }, [draftComment, onSubmit]);

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
              : key === 'n'
                ? 'PENDING'
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
        Comment
        <textarea
          className="mt-2 min-h-20 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          disabled={disabled || isBusy}
          onChange={(event) => setDraftComment(event.target.value)}
          placeholder="Notes, observed behavior, or failure detail"
          value={draftComment}
        />
      </label>

      <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-600 hover:bg-slate-100 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        <span className="truncate">
          {isUploading
            ? `Uploading ${uploadingFiles.length} file${uploadingFiles.length > 1 ? 's' : ''}`
            : 'Attach media'}
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
          <p className="text-xs font-medium uppercase text-slate-500">Current evidence</p>
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
                    {attachment.uploadedBy?.name ? ` by ${attachment.uploadedBy.name}` : ''}
                  </span>
                </span>
                <button
                  className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled || isBusy}
                  onClick={() => void onRemoveAttachment(attachment)}
                  title="Remove evidence"
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

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {actionConfig.map((action) => {
          const Icon = action.icon;

          return (
            <button
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                currentStatus === action.status
                  ? action.activeClassName
                  : `bg-white ${action.className}`
              }`}
              disabled={disabled || isBusy}
              key={action.status}
              onClick={() => void submitStatus(action.status)}
              title={action.title}
              type="button"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

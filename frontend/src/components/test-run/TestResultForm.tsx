import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Paperclip, SkipForward, XCircle } from 'lucide-react';
import type { ExecuteTestResultPayload, TestResultStatus } from '../../types/testRun';

type TestResultFormProps = {
  comment?: string;
  attachments?: string[];
  currentStatus: TestResultStatus;
  disabled: boolean;
  isActive: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: ExecuteTestResultPayload) => Promise<void>;
};

const actionConfig: Array<{
  status: Exclude<TestResultStatus, 'PENDING'>;
  label: string;
  title: string;
  className: string;
  activeClassName: string;
  icon: typeof CheckCircle2;
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

export function TestResultForm({
  comment = '',
  attachments = [],
  currentStatus,
  disabled,
  isActive,
  isSubmitting,
  onSubmit,
}: TestResultFormProps) {
  const [draftComment, setDraftComment] = useState(comment);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const selectedAttachmentLabels = useMemo(
    () => selectedFiles.map((file) => `${file.name} (${formatFileSize(file.size)})`),
    [selectedFiles],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
  };

  const submitStatus = useCallback(async (status: Exclude<TestResultStatus, 'PENDING'>) => {
    await onSubmit({
      status,
      comment: draftComment.trim(),
      attachments: [...attachments, ...selectedAttachmentLabels],
    });
    setSelectedFiles([]);
  }, [attachments, draftComment, onSubmit, selectedAttachmentLabels]);

  useEffect(() => {
    if (!isActive || disabled || isSubmitting) {
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
        key === 'p' ? 'PASSED' : key === 'f' ? 'FAILED' : key === 's' ? 'SKIPPED' : undefined;

      if (!status) {
        return;
      }

      event.preventDefault();
      void submitStatus(status);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isActive, isSubmitting, submitStatus]);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium uppercase text-slate-500">
        Comment
        <textarea
          className="mt-2 min-h-20 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          disabled={disabled || isSubmitting}
          onChange={(event) => setDraftComment(event.target.value)}
          placeholder="Notes, observed behavior, or failure detail"
          value={draftComment}
        />
      </label>

      <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-600 hover:bg-slate-100 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        <span className="truncate">
          {selectedFiles.length > 0
            ? `${selectedFiles.length} attachment${selectedFiles.length > 1 ? 's' : ''} selected`
            : 'Attach media'}
        </span>
        <input
          className="sr-only"
          disabled={disabled || isSubmitting}
          multiple
          onChange={handleFileChange}
          type="file"
        />
      </label>

      {selectedAttachmentLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedAttachmentLabels.map((attachment) => (
            <span
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
              key={attachment}
            >
              {attachment}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        {actionConfig.map((action) => {
          const Icon = action.icon;

          return (
            <button
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                currentStatus === action.status
                  ? action.activeClassName
                  : `bg-white ${action.className}`
              }`}
              disabled={disabled || isSubmitting}
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

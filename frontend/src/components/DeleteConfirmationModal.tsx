import { AlertTriangle, Trash2 } from 'lucide-react';

type DeleteConfirmationModalProps = {
  title: string;
  description?: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmationModal({
  title,
  description,
  loading,
  onCancel,
  onConfirm,
}: DeleteConfirmationModalProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 px-4 py-6 backdrop-blur-sm sm:items-center"
      onClick={(event) => event.target === event.currentTarget && !loading && onCancel()}
      role="presentation"
    >
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        role="dialog"
      >
        <div className="flex items-start gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm font-medium text-rose-600 dark:text-rose-300">
              This action cannot be undone
            </p>
          </div>
        </div>

        {description ? (
          <p className="px-5 py-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {description}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-800"
            disabled={loading}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500 dark:hover:bg-rose-400"
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {loading ? 'Deleting' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

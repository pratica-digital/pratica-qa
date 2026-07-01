import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-600/40 px-4 py-6 backdrop-blur-sm sm:items-center"
      onClick={(event) => event.target === event.currentTarget && !loading && onCancel()}
      role="presentation"
    >
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm font-medium text-red-600">
              Esta ação não pode ser desfeita
            </p>
          </div>
        </div>

        {description ? (
          <p className="px-5 py-4 text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-600 px-4 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {loading ? 'Excluindo' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

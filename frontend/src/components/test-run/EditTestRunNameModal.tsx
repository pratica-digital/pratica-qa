import { AlertCircle, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../auth/useAuth';
import { testRunsApi } from '../../lib/api';
import {
  normalizeTestRunName,
  TEST_RUN_NAME_MAX_LENGTH,
  validateTestRunName,
} from '../../lib/testRunName';
import type { TestRun } from '../../types/testRun';

type EditTestRunNameModalProps = {
  testRun: TestRun;
  onClose: () => void;
  onUpdated: (testRun: TestRun) => void;
};

export function EditTestRunNameModal({
  testRun,
  onClose,
  onUpdated,
}: EditTestRunNameModalProps) {
  const { token } = useAuth();
  const [name, setName] = useState(testRun.name);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const normalizedName = normalizeTestRunName(name);
  const hasChanged = normalizedName !== normalizeTestRunName(testRun.name);

  async function handleSubmit() {
    if (!token || submitting) {
      return;
    }

    const validationError = validateTestRunName(name);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!hasChanged) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const updatedRun = await testRunsApi.update(token, testRun.id, {
        name: normalizedName,
      });
      onUpdated(updatedRun);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível atualizar o nome do Test Run.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4"
      onClick={(event) => event.target === event.currentTarget && !submitting && onClose()}
      role="presentation"
    >
      <div
        aria-labelledby="edit-test-run-name-title"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-slate-950" id="edit-test-run-name-title">
            Editar nome do Test Run
          </h2>
          <button
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="space-y-4 p-5">
            {error ? (
              <p
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            ) : null}

            <label className="block text-sm font-medium text-slate-700" htmlFor="test-run-name">
              Nome
              <input
                aria-describedby="test-run-name-hint"
                aria-invalid={Boolean(error)}
                autoFocus
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:bg-slate-100"
                disabled={submitting}
                id="test-run-name"
                maxLength={TEST_RUN_NAME_MAX_LENGTH}
                onBlur={() => setError(validateTestRunName(name))}
                onChange={(event) => {
                  setName(event.target.value);
                  setError('');
                }}
                required
                type="text"
                value={name}
              />
            </label>
            <p className="text-xs text-slate-500" id="test-run-name-hint">
              {name.length}/{TEST_RUN_NAME_MAX_LENGTH} caracteres
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button
              className="h-9 rounded-lg bg-slate-600 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="h-9 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting || !hasChanged || Boolean(validateTestRunName(name))}
              type="submit"
            >
              {submitting ? 'Salvando' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

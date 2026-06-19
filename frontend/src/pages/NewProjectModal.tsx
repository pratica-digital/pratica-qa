import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, FolderOpen, X } from 'lucide-react';
import type { CreateProjectPayload } from '../types/testRun';

type ProjectForm = {
  name: string;
  key: string;
  description: string;
};

type ProjectFormErrors = Partial<Record<keyof ProjectForm, string>>;

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
};

type NewProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateProjectPayload) => Promise<void>;
};

const initialForm: ProjectForm = {
  name: '',
  key: '',
  description: '',
};

function Field({ label, required = false, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-blue-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function normalizeKey(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
}

export function NewProjectModal({ open, onClose, onCreate }: NewProjectModalProps) {
  const [form, setForm] = useState<ProjectForm>(initialForm);
  const [errors, setErrors] = useState<ProjectFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalizedKey = useMemo(() => normalizeKey(form.key), [form.key]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function setField<FieldName extends keyof ProjectForm>(
    field: FieldName,
    value: ProjectForm[FieldName],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: ProjectFormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Name is required';
    }

    if (!normalizedKey) {
      nextErrors.key = 'Key is required';
    } else if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(normalizedKey)) {
      nextErrors.key = 'Use uppercase letters, numbers, _ or -';
    }

    return nextErrors;
  }

  async function handleSubmit() {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await onCreate({
        name: form.name.trim(),
        key: normalizedKey,
        description: form.description.trim(),
      });
      setForm(initialForm);
      setErrors({});
      onClose();
    } catch (createError) {
      setSubmitError(createError instanceof Error ? createError.message : 'Unable to create project.');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-950">New project</h2>
            <p className="truncate text-xs text-slate-400">Create the QA workspace container</p>
          </div>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            title="Close modal"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Field label="Project name" required>
            <input
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              onChange={(event) => setField('name', event.target.value)}
              placeholder="Customer Web App"
              value={form.name}
            />
            {errors.name ? (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.name}
              </p>
            ) : null}
          </Field>

          <Field label="Project key" required hint="Example: WEB, API, MOBILE_CHECKOUT">
            <input
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              maxLength={24}
              onChange={(event) => setField('key', normalizeKey(event.target.value))}
              placeholder="WEB"
              value={form.key}
            />
            {errors.key ? (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.key}
              </p>
            ) : null}
          </Field>

          <Field label="Description" hint="Optional scope or product context">
            <textarea
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              onChange={(event) => setField('description', event.target.value)}
              placeholder="Primary QA project for the customer web experience"
              rows={3}
              value={form.description}
            />
          </Field>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-red-500">{submitError}</p>
          <div className="flex items-center justify-end gap-2">
            <button
              className="h-9 rounded-lg bg-slate-600 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
              disabled={submitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              type="button"
            >
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'Creating' : 'Create project'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}

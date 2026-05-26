import { useMemo, useState, type ReactNode } from 'react';
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
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required ? <span className="ml-1 text-sky-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-zinc-400">{hint}</p> : null}
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg rounded-t-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-lg">
        <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">New project</h2>
            <p className="truncate text-xs text-zinc-400">Create the QA workspace container</p>
          </div>
          <button
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            title="Close modal"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <Field label="Project name" required>
            <input
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-sky-400"
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
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm uppercase text-zinc-900 outline-none transition placeholder:normal-case placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-sky-400"
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
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-sky-400"
              onChange={(event) => setField('description', event.target.value)}
              placeholder="Primary QA project for the customer web experience"
              rows={3}
              value={form.description}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <p className="text-xs text-rose-500">{submitError}</p>
          <div className="flex items-center justify-end gap-2">
            <button
              className="h-9 rounded-lg px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              disabled={submitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
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
  );
}

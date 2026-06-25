import { useEffect, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ChevronDown, Layers3, X } from 'lucide-react';
import type { CreateTestSuitePayload, ProjectSummary } from '../types/testRun';

type SuiteForm = {
  name: string;
  project: string;
};

type SuiteFormErrors = Partial<Record<keyof SuiteForm, string>>;

type FieldProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
};

type NewSuiteModalProps = {
  open: boolean;
  onClose: () => void;
  onCreateFromApi?: (payload: CreateTestSuitePayload) => Promise<void>;
  projects?: ProjectSummary[];
};

const initialForm: SuiteForm = {
  name: '',
  project: '',
};

function Field({ label, required = false, children, hint }: FieldProps) {
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

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      {...props}
    />
  );
}

function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-9 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function NewSuiteModal({
  open,
  onClose,
  onCreateFromApi,
  projects,
}: NewSuiteModalProps) {
  const [form, setForm] = useState<SuiteForm>(initialForm);
  const [errors, setErrors] = useState<SuiteFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const projectOptions = (projects ?? []).map((project) => ({ id: project.id, name: project.name }));
  const hasProjectOptions = projectOptions.length > 0;

  function setField<Field extends keyof SuiteForm>(field: Field, value: SuiteForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: SuiteFormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Name is required';
    }

    if (!form.project) {
      nextErrors.project = !hasProjectOptions ? 'Create a project before creating a suite' : 'Select a project';
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
      await onCreateFromApi?.({
        projectId: form.project,
        name: form.name.trim(),
      });

      onClose();
      setForm(initialForm);
      setErrors({});
    } catch (createError) {
      setSubmitError(createError instanceof Error ? createError.message : 'Unable to create test suite.');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-950">New test suite</h2>
            <p className="truncate text-xs text-slate-400">Create a suite for a project area</p>
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
          <Field label="Suite name" required hint="Use a clear name, for example Auth login flow">
            <Input
              onChange={(event) => setField('name', event.target.value)}
              placeholder="Checkout payment flow"
              value={form.name}
            />
            {errors.name ? (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.name}
              </p>
            ) : null}
          </Field>

          <Field label="Project" required>
            <Select value={form.project} onChange={(event) => setField('project', event.target.value)}>
              <option value="">
                {!hasProjectOptions ? 'No projects available' : 'Select...'}
              </option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            {errors.project ? (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.project}
              </p>
            ) : null}
          </Field>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-red-500">{submitError}</p>
          <div className="flex items-center justify-end gap-2">
          <button
            className="h-9 rounded-lg bg-slate-600 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting || !hasProjectOptions}
            onClick={handleSubmit}
            type="button"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating
              </>
            ) : (
              <>
                <Layers3 className="h-4 w-4" aria-hidden="true" />
                Create suite
              </>
            )}
          </button>
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}

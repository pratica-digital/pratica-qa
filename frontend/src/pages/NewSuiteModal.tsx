import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { AlertCircle, ChevronDown, Layers3, X } from 'lucide-react';
import type { TestSuite } from '../data/workspace';
import type { CreateTestSuitePayload, ProjectSummary } from '../types/testRun';

const PROJECTS = ['Frontend', 'Backend', 'Mobile', 'API', 'Infrastructure'];
const OWNERS = ['Alice Chen', 'Bob Lima', 'Carlos Souza', 'Diana Park', 'Eduardo Melo'];
const STATUSES = ['active', 'draft', 'archived'] as const;

type SuiteFormStatus = (typeof STATUSES)[number];

type SuiteForm = {
  name: string;
  project: string;
  owner: string;
  status: SuiteFormStatus;
  description: string;
  tags: string;
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
  onCreate?: (suite: TestSuite) => void;
  onCreateFromApi?: (payload: CreateTestSuitePayload) => Promise<void>;
  projects?: ProjectSummary[];
};

const statusLabels: Record<SuiteFormStatus, TestSuite['status']> = {
  active: 'Active',
  draft: 'Draft',
  archived: 'Archived',
};

const initialForm: SuiteForm = {
  name: '',
  project: '',
  owner: '',
  status: 'draft',
  description: '',
  tags: '',
};

function Field({ label, required = false, children, hint }: FieldProps) {
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

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-sky-400"
      {...props}
    />
  );
}

function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className="h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-9 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
    </div>
  );
}

export function NewSuiteModal({
  open,
  onClose,
  onCreate,
  onCreateFromApi,
  projects,
}: NewSuiteModalProps) {
  const [form, setForm] = useState<SuiteForm>(initialForm);
  const [errors, setErrors] = useState<SuiteFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  const apiMode = Boolean(onCreateFromApi);
  const projectOptions =
    apiMode
      ? (projects ?? []).map((project) => ({ id: project.id, name: project.name }))
      : PROJECTS.map((project) => ({ id: project, name: project }));

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
      nextErrors.project =
        apiMode && !hasProjectOptions ? 'Create a project before creating a suite' : 'Select a project';
    }

    if (!apiMode && !form.owner) {
      nextErrors.owner = 'Select an owner';
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
      if (onCreateFromApi) {
        await onCreateFromApi({
          projectId: form.project,
          name: form.name.trim(),
          description: form.description.trim(),
        });
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 300));

        onCreate?.({
          name: form.name.trim(),
          project: form.project,
          owner: form.owner,
          status: statusLabels[form.status],
          coverage: 0,
          cases: 0,
          failures: 0,
        });
      }

      onClose();
      setForm(initialForm);
      setErrors({});
    } catch (createError) {
      setSubmitError(createError instanceof Error ? createError.message : 'Unable to create test suite.');
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
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">New test suite</h2>
            <p className="truncate text-xs text-zinc-400">Create a suite for a project area</p>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project" required>
              <Select value={form.project} onChange={(event) => setField('project', event.target.value)}>
                <option value="">
                  {apiMode && !hasProjectOptions ? 'No projects available' : 'Select...'}
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

            <Field label="Owner" required={!apiMode}>
              <Select value={form.owner} onChange={(event) => setField('owner', event.target.value)}>
                <option value="">Select...</option>
                {OWNERS.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </Select>
              {errors.owner ? (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.owner}
                </p>
              ) : null}
            </Field>
          </div>

          <Field label="Initial status">
            <div className="flex gap-2">
              {STATUSES.map((status) => (
                <button
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition ${
                    form.status === status
                      ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-300'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                  key={status}
                  onClick={() => setField('status', status)}
                  type="button"
                >
                  {status}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Description" hint="Optional context for this suite">
            <textarea
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-sky-400"
              onChange={(event) => setField('description', event.target.value)}
              placeholder="Describe the scope or goal of this suite"
              rows={3}
              value={form.description}
            />
          </Field>

          <Field label="Tags" hint="Separate tags with commas">
            <Input
              onChange={(event) => setField('tags', event.target.value)}
              placeholder="smoke, regression, critical"
              value={form.tags}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <p className="text-xs text-rose-500">{submitError}</p>
          <div className="flex items-center justify-end gap-2">
          <button
            className="h-9 rounded-lg px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            disabled={submitting || (apiMode && !hasProjectOptions)}
            onClick={handleSubmit}
            type="button"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-950/30 dark:border-t-zinc-950" />
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
  );
}

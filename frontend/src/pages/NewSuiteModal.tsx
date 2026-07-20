import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Layers3, X } from 'lucide-react';
import type { CreateTestSuitePayload, ProjectSummary } from '../types/testRun';

type SuiteForm = {
  name: string;
  projectIds: string[];
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
  projectIds: [],
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
  function setField<Field extends keyof SuiteForm>(field: Field, value: SuiteForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: SuiteFormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Nome obrigatório';
    }

    return nextErrors;
  }

  function toggleProject(projectId: string) {
    setField(
      'projectIds',
      form.projectIds.includes(projectId)
        ? form.projectIds.filter((id) => id !== projectId)
        : [...form.projectIds, projectId],
    );
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
        projectIds: form.projectIds,
        name: form.name.trim(),
      });

      onClose();
      setForm(initialForm);
      setErrors({});
    } catch (createError) {
      setSubmitError(createError instanceof Error ? createError.message : 'Não foi possível criar a suíte de teste.');
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
            <h2 className="text-sm font-semibold text-slate-950">Nova suíte de teste</h2>
            <p className="truncate text-xs text-slate-400">Crie uma suíte para uma área do projeto</p>
          </div>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            title="Fechar modal"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Field label="Nome da suíte" required hint="Use um nome claro, por exemplo Fluxo de login">
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

          <Field
            label="Equipamentos"
            hint="Selecione um ou mais equipamentos. Sem seleção, a suíte será Geral."
          >
            <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
              {projectOptions.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum equipamento cadastrado.</p>
              ) : null}
              {projectOptions.map((project) => (
                <label
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-blue-300"
                  key={project.id}
                >
                  <input
                    checked={form.projectIds.includes(project.id)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                    onChange={() => toggleProject(project.id)}
                    type="checkbox"
                  />
                  <span className="truncate">{project.name}</span>
                </label>
              ))}
            </div>
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
            Cancelar
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            onClick={handleSubmit}
            type="button"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Criando
              </>
            ) : (
              <>
                <Layers3 className="h-4 w-4" aria-hidden="true" />
                Criar suíte
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

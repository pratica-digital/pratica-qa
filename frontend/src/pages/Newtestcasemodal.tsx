import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ChevronDown, GripVertical, ListChecks, Plus, Trash2, X } from 'lucide-react';
import type { CreateTestCasePayload, ManagedTestSuite } from '../types/testRun';

type TabId = 'basic' | 'steps';

type StepDraft = {
  clientId: string;
  description: string;
};

type TestCaseForm = {
  title: string;
  suiteId: string;
  description: string;
  expectedResult: string;
};

type TestCaseFormErrors = Partial<Record<keyof TestCaseForm | 'steps', string>>;

type FieldProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
};

type StepRowProps = {
  step: StepDraft;
  index: number;
  total: number;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
};

type NewTestCaseModalProps = {
  open: boolean;
  onClose: () => void;
  onCreateFromApi?: (payload: CreateTestCasePayload) => Promise<void>;
  suites?: ManagedTestSuite[];
};

const initialForm: TestCaseForm = {
  title: '',
  suiteId: '',
  description: '',
  expectedResult: '',
};

function createBlankStep(): StepDraft {
  return {
    clientId: `step-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description: '',
  };
}

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

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      rows={3}
      {...props}
    />
  );
}

function SelectField({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
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

function StepRow({ step, index, total, onChange, onRemove }: StepRowProps) {
  return (
    <div className="flex items-start gap-2">
      <button
        className="mt-2.5 cursor-grab text-slate-300 hover:text-slate-500"
        tabIndex={-1}
        type="button"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
        {index + 1}
      </span>
      <input
        className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        onChange={(event) => onChange(index, event.target.value)}
        placeholder={`Step ${index + 1} description`}
        value={step.description}
      />
      <button
        className="mt-2 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-100 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
        disabled={total === 1}
        onClick={() => onRemove(index)}
        tabIndex={-1}
        title="Remover passo"
        type="button"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function NewTestCaseModal({
  open,
  onClose,
  onCreateFromApi,
  suites,
}: NewTestCaseModalProps) {
  const [form, setForm] = useState<TestCaseForm>(initialForm);
  const [steps, setSteps] = useState<StepDraft[]>(() => [createBlankStep()]);
  const [errors, setErrors] = useState<TestCaseFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('basic');

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

  const suiteOptions = (suites ?? []).map((suite) => ({
    id: suite.id,
    name: suite.name,
    projectName: suite.project?.name ?? suite.projectId,
  }));
  const hasSuiteOptions = suiteOptions.length > 0;
  const selectedSuite = suiteOptions.find((suite) => suite.id === form.suiteId);

  function setField<Field extends keyof TestCaseForm>(field: Field, value: TestCaseForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function addStep() {
    setSteps((current) => [...current, createBlankStep()]);
  }

  function updateStep(index: number, value: string) {
    setSteps((current) =>
      current.map((step, currentIndex) =>
        currentIndex === index ? { ...step, description: value } : step,
      ),
    );
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function validate() {
    const nextErrors: TestCaseFormErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = 'Title is required';
    }

    if (!form.suiteId) {
      nextErrors.suiteId = !hasSuiteOptions ? 'Create a suite before creating a test case' : 'Select a suite';
    }

    if (!form.expectedResult.trim()) {
      nextErrors.expectedResult = 'Expected result is required';
    }

    if (steps.some((step) => !step.description.trim())) {
      nextErrors.steps = 'All steps need a description';
    }

    return nextErrors;
  }

  async function handleSubmit() {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setActiveTab(nextErrors.steps ? 'steps' : 'basic');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await onCreateFromApi?.({
        suiteId: form.suiteId,
        title: form.title.trim(),
        status: 'ACTIVE',
        description: form.description.trim(),
        expectedResult: form.expectedResult.trim(),
        steps: steps.map((step, index) => ({
          order: index + 1,
          description: step.description.trim(),
        })),
      });

      onClose();
      setForm(initialForm);
      setSteps([createBlankStep()]);
      setErrors({});
      setActiveTab('basic');
    } catch (createError) {
      setSubmitError(createError instanceof Error ? createError.message : 'Não foi possível criar o caso de teste.');
    } finally {
      setSubmitting(false);
    }
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'basic', label: 'Details' },
    { id: 'steps', label: `Steps (${steps.length})` },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-950">New test case</h2>
            <p className="truncate text-xs text-slate-400">Define the scenario and execution steps</p>
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

        <div className="flex border-b border-slate-200 px-5">
          {tabs.map((tab) => (
            <button
              className={`-mb-px mr-5 border-b-2 py-3 text-xs font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
              {tab.id === 'steps' && errors.steps ? (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                  !
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {activeTab === 'basic' ? (
            <div className="space-y-4">
              <Field label="Case title" required>
                <Input
                  onChange={(event) => setField('title', event.target.value)}
                  placeholder="User signs in with valid credentials"
                  value={form.title}
                />
                {errors.title ? (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.title}
                  </p>
                ) : null}
              </Field>

              <Field label="Suite" required>
                <SelectField
                  onChange={(event) => setField('suiteId', event.target.value)}
                  value={form.suiteId}
                >
                  <option value="">
                    {!hasSuiteOptions ? 'No suites available' : 'Select suite...'}
                  </option>
                  {suiteOptions.map((suite) => (
                    <option key={suite.id} value={suite.id}>
                      {suite.projectName} / {suite.name}
                    </option>
                  ))}
                </SelectField>
                {errors.suiteId ? (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.suiteId}
                  </p>
                ) : null}
              </Field>

              {selectedSuite ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Project: <span className="font-medium text-slate-900">{selectedSuite.projectName}</span>
                  <span className="mx-2 text-slate-300">/</span>
                  Suite: <span className="font-medium text-slate-900">{selectedSuite.name}</span>
                </div>
              ) : null}

              <Field label="Description" hint="Context and preconditions for this case">
                <Textarea
                  onChange={(event) => setField('description', event.target.value)}
                  placeholder="Describe setup, preconditions, or useful notes"
                  value={form.description}
                />
              </Field>

              <Field label="Expected result" required hint="What should happen at the end of execution">
                <Textarea
                  onChange={(event) => setField('expectedResult', event.target.value)}
                  placeholder="The user lands on the dashboard and sees a success state"
                  value={form.expectedResult}
                />
                {errors.expectedResult ? (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.expectedResult}
                  </p>
                ) : null}
              </Field>
            </div>
          ) : null}

          {activeTab === 'steps' ? (
            <div className="space-y-3">
              {errors.steps ? (
                <p className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" /> {errors.steps}
                </p>
              ) : null}
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <StepRow
                    index={index}
                    key={step.clientId}
                    onChange={updateStep}
                    onRemove={removeStep}
                    step={step}
                    total={steps.length}
                  />
                ))}
              </div>
              <button
                className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-100 hover:text-blue-600"
                onClick={addStep}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add step
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-400">
            {submitError || `${steps.length} ${steps.length === 1 ? 'step' : 'steps'} defined`}
          </p>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-lg bg-slate-600 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting || !hasSuiteOptions}
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
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                  Create case
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

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
import type { TestCase } from '../data/workspace';
import type { CreateTestCasePayload, ManagedTestSuite } from '../types/testRun';

const SUITES = ['Authentication', 'Checkout', 'Reporting', 'Rate limits', 'Mobile Checkout'];
const PRIORITIES = ['low', 'medium', 'high'] as const;

type Priority = (typeof PRIORITIES)[number];
type TabId = 'basic' | 'steps';

type StepDraft = {
  description: string;
};

type TestCaseForm = {
  title: string;
  suiteId: string;
  priority: Priority;
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
  onCreate?: (testCase: TestCase) => void;
  onCreateFromApi?: (payload: CreateTestCasePayload) => Promise<void>;
  suites?: ManagedTestSuite[];
};

const priorityStyles: Record<Priority, string> = {
  low: 'border-slate-200 bg-white text-slate-500',
  medium:
    'border-amber-400 bg-amber-100 text-amber-800',
  high: 'border-red-400 bg-red-100 text-red-800',
};

const prioritySelected: Record<Priority, string> = {
  low: 'border-blue-500 bg-blue-100 text-blue-800',
  medium:
    'border-amber-500 bg-amber-100 text-amber-800',
  high: 'border-red-500 bg-red-100 text-red-800',
};

const priorityLabels: Record<Priority, TestCase['priority']> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const initialForm: TestCaseForm = {
  title: '',
  suiteId: '',
  priority: 'medium',
  description: '',
  expectedResult: '',
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
        title="Remove step"
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
  onCreate,
  onCreateFromApi,
  suites,
}: NewTestCaseModalProps) {
  const [form, setForm] = useState<TestCaseForm>(initialForm);
  const [steps, setSteps] = useState<StepDraft[]>([{ description: '' }]);
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

  const apiMode = Boolean(onCreateFromApi);
  const suiteOptions =
    apiMode
      ? (suites ?? []).map((suite) => ({ id: suite.id, name: suite.name }))
      : SUITES.map((suite) => ({ id: suite, name: suite }));
  const hasSuiteOptions = suiteOptions.length > 0;

  function setField<Field extends keyof TestCaseForm>(field: Field, value: TestCaseForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function addStep() {
    setSteps((current) => [...current, { description: '' }]);
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
      nextErrors.suiteId =
        apiMode && !hasSuiteOptions ? 'Create a suite before creating a test case' : 'Select a suite';
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
      if (onCreateFromApi) {
        await onCreateFromApi({
          suiteId: form.suiteId,
          title: form.title.trim(),
          priority: form.priority.toUpperCase() as CreateTestCasePayload['priority'],
          status: 'ACTIVE',
          description: form.description.trim(),
          expectedResult: form.expectedResult.trim(),
          steps: steps.map((step, index) => ({
            order: index + 1,
            description: step.description.trim(),
          })),
        });
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 300));

        onCreate?.({
          id: `TC-${Date.now()}`,
          title: form.title.trim(),
          suite: form.suiteId,
          priority: priorityLabels[form.priority],
          status: 'Draft',
          steps: steps.length,
          tags: [],
        });
      }

      onClose();
      setForm(initialForm);
      setSteps([{ description: '' }]);
      setErrors({});
      setActiveTab('basic');
    } catch (createError) {
      setSubmitError(createError instanceof Error ? createError.message : 'Unable to create test case.');
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
                    {apiMode && !hasSuiteOptions ? 'No suites available' : 'Select suite...'}
                  </option>
                  {suiteOptions.map((suite) => (
                    <option key={suite.id} value={suite.id}>
                      {suite.name}
                    </option>
                  ))}
                </SelectField>
                {errors.suiteId ? (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.suiteId}
                  </p>
                ) : null}
              </Field>

              <Field label="Priority">
                <div className="flex gap-2">
                  {PRIORITIES.map((priority) => (
                    <button
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition ${
                        form.priority === priority ? prioritySelected[priority] : priorityStyles[priority]
                      }`}
                      key={priority}
                      onClick={() => setField('priority', priority)}
                      type="button"
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </Field>

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
                    key={`${index}-${step.description}`}
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
              disabled={submitting || (apiMode && !hasSuiteOptions)}
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

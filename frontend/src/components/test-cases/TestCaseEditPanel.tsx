import { useState } from 'react';
import { ArrowDown, ArrowUp, ListChecks, Plus, Save, Trash2, X } from 'lucide-react';
import type {
  ManagedTestCase,
  ManagedTestSuite,
  ReplaceTestStepsPayload,
  TestCaseStatus,
  TestPriority,
  UpdateTestCasePayload,
} from '../../types/testRun';

type StepDraft = {
  clientId: string;
  description: string;
  expectedResult: string;
};

type TestCaseEditPanelProps = {
  testCase: ManagedTestCase;
  suites: ManagedTestSuite[];
  readOnly: boolean;
  onClose: () => void;
  onDelete?: (testCase: ManagedTestCase) => void;
  onSave: (
    testCase: ManagedTestCase,
    payload: UpdateTestCasePayload,
    steps: ReplaceTestStepsPayload,
  ) => Promise<void>;
};

const priorities: TestPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const statuses: TestCaseStatus[] = ['ACTIVE', 'ARCHIVED'];

function toStepDrafts(testCase: ManagedTestCase): StepDraft[] {
  return [...(testCase.steps ?? [])]
    .sort((left, right) => left.order - right.order)
    .map((step) => ({
      clientId: step.id,
      description: step.description,
      expectedResult: step.expectedResult ?? '',
    }));
}

function createBlankStep(): StepDraft {
  return {
    clientId: `step-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description: '',
    expectedResult: '',
  };
}

export function TestCaseEditPanel({
  testCase,
  suites,
  readOnly,
  onClose,
  onDelete,
  onSave,
}: TestCaseEditPanelProps) {
  const [title, setTitle] = useState(testCase.title);
  const [description, setDescription] = useState(testCase.description ?? '');
  const [expectedResult, setExpectedResult] = useState(testCase.expectedResult ?? '');
  const [priority, setPriority] = useState<TestPriority>(testCase.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<TestCaseStatus>(testCase.status ?? 'ACTIVE');
  const [steps, setSteps] = useState<StepDraft[]>(() => toStepDrafts(testCase));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const suiteName =
    suites.find((suite) => suite.id === testCase.suiteId)?.name ?? testCase.suite?.name ?? 'Suite';

  function updateStep(index: number, field: 'description' | 'expectedResult', value: string) {
    setSteps((current) =>
      current.map((step, currentIndex) =>
        currentIndex === index ? { ...step, [field]: value } : step,
      ),
    );
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSave() {
    const normalizedSteps = steps
      .map((step, index) => ({
        order: index + 1,
        description: step.description.trim(),
        expectedResult: step.expectedResult.trim() || undefined,
      }))
      .filter((step) => step.description.length > 0);

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    if (normalizedSteps.length !== steps.length) {
      setError('Empty steps must be removed or filled before saving.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave(
        testCase,
        {
          title: title.trim(),
          description: description.trim(),
          expectedResult: expectedResult.trim(),
          priority,
          status,
        },
        { steps: normalizedSteps },
      );
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save test case.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-lg">
        <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
              Edit test case
            </h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{suiteName}</p>
          </div>
          {onDelete ? (
            <button
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
              disabled={readOnly || saving}
              onClick={() => onDelete(testCase)}
              title="Delete test case"
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          ) : null}
          <button
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title
              <input
                className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                disabled={readOnly || saving}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Priority
                <select
                  className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                  disabled={readOnly || saving}
                  onChange={(event) => setPriority(event.target.value as TestPriority)}
                  value={priority}
                >
                  {priorities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Status
                <select
                  className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                  disabled={readOnly || saving}
                  onChange={(event) => setStatus(event.target.value as TestCaseStatus)}
                  value={status}
                >
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description
              <textarea
                className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                disabled={readOnly || saving}
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>

            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Expected result
              <textarea
                className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                disabled={readOnly || saving}
                onChange={(event) => setExpectedResult(event.target.value)}
                value={expectedResult}
              />
            </label>
          </div>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Steps</h3>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                disabled={readOnly || saving}
                onClick={() => setSteps((current) => [...current, createBlankStep()])}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Step
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {steps.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No steps defined.
                </p>
              ) : null}

              {steps.map((step, index) => (
                <div
                  className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 lg:grid-cols-[2.5rem_1fr_1fr_7.5rem]"
                  key={step.clientId}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
                    {index + 1}
                  </span>
                  <input
                    className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                    disabled={readOnly || saving}
                    onChange={(event) => updateStep(index, 'description', event.target.value)}
                    placeholder="Step description"
                    value={step.description}
                  />
                  <input
                    className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                    disabled={readOnly || saving}
                    onChange={(event) => updateStep(index, 'expectedResult', event.target.value)}
                    placeholder="Step expected result"
                    value={step.expectedResult}
                  />
                  <div className="flex h-10 items-center justify-end gap-1">
                    <button
                      className="rounded-lg p-2 text-zinc-400 hover:bg-white hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-950 dark:hover:text-zinc-200"
                      disabled={readOnly || saving || index === 0}
                      onClick={() => moveStep(index, -1)}
                      title="Move up"
                      type="button"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-zinc-400 hover:bg-white hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-950 dark:hover:text-zinc-200"
                      disabled={readOnly || saving || index === steps.length - 1}
                      onClick={() => moveStep(index, 1)}
                      title="Move down"
                      type="button"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950 dark:hover:text-rose-300"
                      disabled={readOnly || saving}
                      onClick={() => removeStep(index)}
                      title="Remove step"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 text-sm text-rose-600 dark:text-rose-300">{error}</div>
          <div className="flex justify-end gap-2">
            <button
              className="h-9 rounded-lg px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              disabled={readOnly || saving}
              onClick={() => void handleSave()}
              type="button"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Saving' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

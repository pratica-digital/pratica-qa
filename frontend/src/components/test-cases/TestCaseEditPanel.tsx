import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, ListChecks, Plus, Save, Trash2, X } from 'lucide-react';
import { ActionMenu } from '../ActionMenu';
import type {
  ManagedTestCase,
  ManagedTestSuite,
  ReplaceTestStepsPayload,
  TestCaseStatus,
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
  const [status, setStatus] = useState<TestCaseStatus>(testCase.status ?? 'ACTIVE');
  const [steps, setSteps] = useState<StepDraft[]>(() => toStepDrafts(testCase));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const suite = suites.find((item) => item.id === testCase.suiteId);
  const suiteName = suite?.name ?? testCase.suite?.name ?? 'Suite';
  const projectName =
    suite?.project?.name ??
    testCase.suite?.project?.name ??
    suite?.projectId ??
    testCase.suite?.projectId ??
    'Project';

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-950">
              Edit test case
            </h2>
            <p className="truncate text-xs text-slate-500">{projectName} / {suiteName}</p>
          </div>
          {onDelete ? (
            <ActionMenu
              ariaLabel="Test case actions"
              disabled={readOnly || saving}
              items={[
                {
                  label: 'Delete',
                  onSelect: () => onDelete(testCase),
                  title: 'Delete test case',
                  tone: 'danger',
                },
              ]}
            />
          ) : null}
          <button
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
            <label className="block text-sm font-medium text-slate-700">
              Title
              <input
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={readOnly || saving}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Status
                <select
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
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

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Project: <span className="font-medium text-slate-900">{projectName}</span>
            <span className="mx-2 text-slate-300">/</span>
            Suite: <span className="font-medium text-slate-900">{suiteName}</span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Description
              <textarea
                className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={readOnly || saving}
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Expected result
              <textarea
                className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={readOnly || saving}
                onChange={(event) => setExpectedResult(event.target.value)}
                value={expectedResult}
              />
            </label>
          </div>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">Steps</h3>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                  No steps defined.
                </p>
              ) : null}

              {steps.map((step, index) => (
                <div
                  className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[2.5rem_1fr_1fr_7.5rem]"
                  key={step.clientId}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <input
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                    disabled={readOnly || saving}
                    onChange={(event) => updateStep(index, 'description', event.target.value)}
                    placeholder="Step description"
                    value={step.description}
                  />
                  <input
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                    disabled={readOnly || saving}
                    onChange={(event) => updateStep(index, 'expectedResult', event.target.value)}
                    placeholder="Step expected result"
                    value={step.expectedResult}
                  />
                  <div className="flex h-10 items-center justify-end gap-1">
                    <button
                      className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={readOnly || saving || index === 0}
                      onClick={() => moveStep(index, -1)}
                      title="Move up"
                      type="button"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={readOnly || saving || index === steps.length - 1}
                      onClick={() => moveStep(index, 1)}
                      title="Move down"
                      type="button"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
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

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 text-sm text-red-600">{error}</div>
          <div className="flex justify-end gap-2">
            <button
              className="h-9 rounded-lg bg-slate-600 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>,
    document.body,
  );
}

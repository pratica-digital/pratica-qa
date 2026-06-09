import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Layers3, ListChecks, Save, X } from 'lucide-react';
import type {
  ManagedTestCase,
  ManagedTestSuite,
  TestSuiteStatus,
  UpdateTestSuitePayload,
} from '../../types/testRun';

type TestSuiteEditPanelProps = {
  suite: ManagedTestSuite;
  cases: ManagedTestCase[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (
    suite: ManagedTestSuite,
    payload: UpdateTestSuitePayload,
    orderedCaseIds: string[],
  ) => Promise<void>;
};

const statuses: TestSuiteStatus[] = ['ACTIVE', 'ARCHIVED'];

export function TestSuiteEditPanel({
  suite,
  cases,
  readOnly,
  onClose,
  onSave,
}: TestSuiteEditPanelProps) {
  const [name, setName] = useState(suite.name);
  const [description, setDescription] = useState(suite.description ?? '');
  const [status, setStatus] = useState<TestSuiteStatus>(suite.status ?? 'ACTIVE');
  const [position, setPosition] = useState(String(suite.position ?? 0));
  const [orderedCases, setOrderedCases] = useState(cases);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function moveCase(index: number, direction: -1 | 1) {
    setOrderedCases((current) => {
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

  async function handleSave() {
    const parsedPosition = Number(position);

    if (!name.trim()) {
      setError('Suite name is required.');
      return;
    }

    if (!Number.isInteger(parsedPosition) || parsedPosition < 0) {
      setError('Position must be a positive number.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave(
        suite,
        {
          name: name.trim(),
          description: description.trim(),
          status,
          position: parsedPosition,
        },
        orderedCases.map((testCase) => testCase.id),
      );
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save test suite.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-white dark:bg-zinc-950">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
              Edit test suite
            </h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {suite.project?.name ?? 'Project'}
            </p>
          </div>
          <button
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem_10rem]">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
              <input
                className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                disabled={readOnly || saving}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>

            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status
              <select
                className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                disabled={readOnly || saving}
                onChange={(event) => setStatus(event.target.value as TestSuiteStatus)}
                value={status}
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Position
              <input
                className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                disabled={readOnly || saving}
                min={0}
                onChange={(event) => setPosition(event.target.value)}
                type="number"
                value={position}
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Description
            <textarea
              className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              disabled={readOnly || saving}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Case order</h3>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {orderedCases.length} cases
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {orderedCases.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No cases in this suite.
                </p>
              ) : null}

              {orderedCases.map((testCase, index) => (
                <div
                  className="grid min-h-12 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/60 sm:grid-cols-[2rem_1fr_5rem]"
                  key={testCase.id}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-xs font-semibold text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 items-center gap-2">
                    <ListChecks className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {testCase.title}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="rounded-lg p-2 text-zinc-400 hover:bg-white hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-950 dark:hover:text-zinc-200"
                      disabled={readOnly || saving || index === 0}
                      onClick={() => moveCase(index, -1)}
                      title="Move up"
                      type="button"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-zinc-400 hover:bg-white hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-950 dark:hover:text-zinc-200"
                      disabled={readOnly || saving || index === orderedCases.length - 1}
                      onClick={() => moveCase(index, 1)}
                      title="Move down"
                      type="button"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
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
    </div>,
    document.body,
  );
}

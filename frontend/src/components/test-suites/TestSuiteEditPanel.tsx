import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Layers3, ListChecks, Save, X } from 'lucide-react';
import type {
  ManagedTestCase,
  ManagedTestSuite,
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

export function TestSuiteEditPanel({
  suite,
  cases,
  readOnly,
  onClose,
  onSave,
}: TestSuiteEditPanelProps) {
  const [name, setName] = useState(suite.name);
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
          position: parsedPosition,
        },
        orderedCases.map((testCase) => testCase.id),
      );
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar a suíte de teste.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-950">
              Edit test suite
            </h2>
            <p className="truncate text-xs text-slate-500">
              {suite.project?.name ?? 'Project'}
            </p>
          </div>
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
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={readOnly || saving}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Position
              <input
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={readOnly || saving}
                min={0}
                onChange={(event) => setPosition(event.target.value)}
                type="number"
                value={position}
              />
            </label>
          </div>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">Case order</h3>
              <span className="text-xs font-medium text-slate-500">
                {orderedCases.length} cases
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {orderedCases.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                  No cases in this suite.
                </p>
              ) : null}

              {orderedCases.map((testCase, index) => (
                <div
                  className="grid min-h-12 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[2rem_1fr_5rem]"
                  key={testCase.id}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-xs font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 items-center gap-2">
                    <ListChecks className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <p className="truncate text-sm font-medium text-slate-800">
                      {testCase.title}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={readOnly || saving || index === 0}
                      onClick={() => moveCase(index, -1)}
                      title="Move up"
                      type="button"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
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

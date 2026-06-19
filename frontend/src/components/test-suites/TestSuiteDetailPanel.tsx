import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Layers3, ListChecks, Pencil, Trash2, X } from 'lucide-react';
import { CaseStatusBadge, PriorityBadge, SuiteStatusBadge } from '../badges';
import type { ManagedTestCase, ManagedTestSuite } from '../../types/testRun';

type TestSuiteDetailPanelProps = {
  suite: ManagedTestSuite;
  cases: ManagedTestCase[];
  onClose: () => void;
  onDelete?: () => void;
  onEdit: () => void;
  onOpenCase: (testCase: ManagedTestCase) => void;
};

function formatUpdatedAt(value?: string) {
  if (!value) {
    return 'No updates';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TestSuiteDetailPanel({
  suite,
  cases,
  onClose,
  onDelete,
  onEdit,
  onOpenCase,
}: TestSuiteDetailPanelProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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
              {suite.name}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {suite.project?.name ?? suite.projectId}
            </p>
          </div>
          {onDelete ? (
            <button
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-3 text-sm font-medium text-white transition hover:bg-red-700"
              onClick={onDelete}
              title="Delete test suite"
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
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
          <section className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-slate-500">Suite info</p>
              <p className="mt-2 text-sm text-slate-700">
                {suite.description || 'No description'}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Updated {formatUpdatedAt(suite.updatedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">Status</p>
              <div className="mt-2">
                <SuiteStatusBadge status={suite.status} />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">Cases</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{cases.length}</p>
            </div>
          </section>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">Test cases</h3>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700"
                onClick={onEdit}
                type="button"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit suite
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {cases.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                  No cases in this suite.
                </p>
              ) : null}

              {cases.map((testCase) => (
                <button
                  className="grid w-full gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 sm:grid-cols-[2rem_1fr_auto]"
                  key={testCase.id}
                  onClick={() => onOpenCase(testCase)}
                  type="button"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                    <ListChecks className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-950">
                      {testCase.title}
                    </span>
                    <span className="mt-1 line-clamp-1 block text-xs text-slate-500">
                      {testCase.description || testCase.id}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={testCase.priority} />
                    <CaseStatusBadge status={testCase.status} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

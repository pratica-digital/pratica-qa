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
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-lg">
        <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
              {suite.name}
            </h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {suite.project?.name ?? suite.projectId}
            </p>
          </div>
          {onDelete ? (
            <button
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
              onClick={onDelete}
              title="Delete test suite"
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
          <section className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Suite info</p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                {suite.description || 'No description'}
              </p>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Updated {formatUpdatedAt(suite.updatedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Status</p>
              <div className="mt-2">
                <SuiteStatusBadge status={suite.status} />
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Cases</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">{cases.length}</p>
            </div>
          </section>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Test cases</h3>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                onClick={onEdit}
                type="button"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit suite
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {cases.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No cases in this suite.
                </p>
              ) : null}

              {cases.map((testCase) => (
                <button
                  className="grid w-full gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 sm:grid-cols-[2rem_1fr_auto]"
                  key={testCase.id}
                  onClick={() => onOpenCase(testCase)}
                  type="button"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <ListChecks className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-950 dark:text-white">
                      {testCase.title}
                    </span>
                    <span className="mt-1 line-clamp-1 block text-xs text-zinc-500 dark:text-zinc-400">
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
  );
}

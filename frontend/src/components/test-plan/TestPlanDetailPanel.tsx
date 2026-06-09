import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, Pencil, Trash2, X } from 'lucide-react';
import type { TestPlan } from '../../types/testRun';

type TestPlanDetailPanelProps = {
  testPlan: TestPlan;
  onClose: () => void;
  onDelete?: () => void;
  onEdit: () => void;
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

export function TestPlanDetailPanel({ testPlan, onClose, onDelete, onEdit }: TestPlanDetailPanelProps) {
  const sections = testPlan.sections ?? [];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-white dark:bg-zinc-950">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
              {testPlan.name}
            </h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              v{testPlan.version} - {testPlan.project?.name ?? 'Project'}
            </p>
          </div>
          {onDelete ? (
            <button
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
              onClick={onDelete}
              title="Delete test plan"
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          ) : null}
          <button
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={onEdit}
            type="button"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
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
          <section className="grid gap-3 md:grid-cols-[1fr_12rem]">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Plan info</p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                {testPlan.description || 'No description'}
              </p>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Updated {formatUpdatedAt(testPlan.updatedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Sections</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
                {sections.length}
              </p>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Sections</h3>
            <div className="mt-3 space-y-3">
              {sections.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No sections defined.
                </p>
              ) : null}

              {sections.map((section, index) => (
                <article
                  className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 sm:grid-cols-[2.5rem_1fr]"
                  key={`${section.title}-${index}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-zinc-950 dark:text-white">
                      {section.title}
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                      {section.content}
                    </p>
                  </div>
                </article>
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

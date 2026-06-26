import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, X } from 'lucide-react';
import { ActionMenu } from '../ActionMenu';
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

  return new Intl.DateTimeFormat('pt-BR', {
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
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-950">
              {testPlan.name}
            </h2>
            <p className="truncate text-xs text-slate-500">
              v{testPlan.version} - {testPlan.project?.name ?? 'Project'}
            </p>
          </div>
          <ActionMenu
            ariaLabel="Test plan actions"
            items={[
              {
                label: 'Editar',
                onSelect: onEdit,
                title: 'Editar plano de teste',
              },
              ...(onDelete
                ? [
                    {
                      label: 'Excluir',
                      onSelect: onDelete,
                      title: 'Excluir plano de teste',
                      tone: 'danger' as const,
                    },
                  ]
                : []),
            ]}
          />
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
          <section className="grid gap-3 md:grid-cols-[1fr_12rem]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-slate-500">Plan info</p>
              <p className="mt-2 text-sm text-slate-700">
                {testPlan.description || 'No description'}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Updated {formatUpdatedAt(testPlan.updatedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">Sections</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {sections.length}
              </p>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-semibold text-slate-950">Sections</h3>
            <div className="mt-3 space-y-3">
              {sections.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                  No sections defined.
                </p>
              ) : null}

              {sections.map((section, index) => (
                <article
                  className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[2.5rem_1fr]"
                  key={`${section.title}-${index}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-950">
                      {section.title}
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
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

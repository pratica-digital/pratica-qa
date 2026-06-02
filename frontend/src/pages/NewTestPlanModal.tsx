import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import TestPlanCreator from '../components/test-plan/TestPlanCreator';
import type { TestPlan } from '../types/testRun';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (plan: TestPlan) => void;
};

export function NewTestPlanModal({ open, onClose, onCreated }: Props) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-white dark:bg-zinc-950">
      <div className="flex h-dvh w-full flex-col overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">New test plan</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Create a test plan for a project</p>
          </div>
          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
            onClick={onClose}
            title="Close new test plan"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6">
          <TestPlanCreator
            onCreated={(plan) => {
              onCreated?.(plan);
              onClose();
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default NewTestPlanModal;

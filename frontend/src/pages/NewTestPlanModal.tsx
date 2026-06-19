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
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">New test plan</h2>
            <p className="text-sm text-slate-500">Create a test plan for a project</p>
          </div>
          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950"
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

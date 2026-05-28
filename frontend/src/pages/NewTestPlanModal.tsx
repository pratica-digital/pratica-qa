import TestPlanCreator from '../components/test-plan/TestPlanCreator';
import type { TestPlan } from '../types/testRun';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (plan: TestPlan) => void;
};

export function NewTestPlanModal({ open, onClose, onCreated }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">New test plan</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Create a test plan for a project</p>
        <div className="mt-4">
          <TestPlanCreator
            onCreated={(plan) => {
              onCreated?.(plan);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default NewTestPlanModal;

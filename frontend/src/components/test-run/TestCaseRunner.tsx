import { Clock3, FileText, ListChecks, UserCheck } from 'lucide-react';
import { TestResultStatusBadge } from '../badges';
import type { ExecuteTestResultPayload, TestResult } from '../../types/testRun';
import { TestResultForm } from './TestResultForm';

type TestCaseRunnerProps = {
  result: TestResult;
  disabled: boolean;
  disabledReason?: string;
  isActive: boolean;
  isSubmitting: boolean;
  onActivate: () => void;
  onSubmit: (result: TestResult, payload: ExecuteTestResultPayload) => Promise<void>;
};

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not executed';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TestCaseRunner({
  result,
  disabled,
  disabledReason,
  isActive,
  isSubmitting,
  onActivate,
  onSubmit,
}: TestCaseRunnerProps) {
  const { testCase } = result;
  const steps = testCase.steps ?? [];

  return (
    <article
      className={`rounded-lg border bg-white shadow-sm outline-none transition dark:bg-zinc-950 ${
        isActive
          ? 'border-zinc-950 ring-2 ring-zinc-200 dark:border-white dark:ring-zinc-800'
          : 'border-zinc-200 dark:border-zinc-800'
      }`}
      onClick={onActivate}
      onFocus={onActivate}
      tabIndex={0}
    >
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <ListChecks className="h-3 w-3" aria-hidden="true" />
                {testCase.priority ?? 'MEDIUM'}
              </span>
              <TestResultStatusBadge status={result.status} />
            </div>
            <h2 className="mt-3 text-base font-semibold tracking-normal text-zinc-950 dark:text-white">
              {testCase.title}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {testCase.description || 'No description captured for this case.'}
            </p>
          </div>

          <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-300 sm:grid-cols-2 lg:min-w-72 lg:grid-cols-1">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <span>{result.executedBy?.name ?? 'No executor yet'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <span>{formatDate(result.executedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <section>
            <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Steps</h3>
            {steps.length > 0 ? (
              <ol className="mt-3 space-y-3">
                {steps.map((step) => (
                  <li className="flex gap-3" key={step.id}>
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                      {step.order}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-800 dark:text-zinc-100">{step.description}</p>
                      {step.expectedResult ? (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Expected: {step.expectedResult}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                No step detail is available for this case.
              </p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Expected result
            </h3>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
              {testCase.expectedResult || 'Use the step-level expected results for verification.'}
            </p>
          </section>

          {result.comment ? (
            <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="flex items-center gap-2 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                Last comment
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                {result.comment}
              </p>
            </section>
          ) : null}

          {result.attachments && result.attachments.length > 0 ? (
            <section>
              <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Attachments
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.attachments.map((attachment) => (
                  <span
                    className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
                    key={attachment}
                  >
                    {attachment}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
          {disabled && disabledReason ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {disabledReason}
            </p>
          ) : null}
          <TestResultForm
            attachments={result.attachments}
            comment={result.comment}
            currentStatus={result.status}
            disabled={disabled}
            isActive={isActive}
            isSubmitting={isSubmitting}
            onSubmit={(payload) => onSubmit(result, payload)}
          />
        </aside>
      </div>
    </article>
  );
}

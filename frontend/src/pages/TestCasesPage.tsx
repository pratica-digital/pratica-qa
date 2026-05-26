import { Filter, ListChecks, Plus, Search, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { CaseStatusBadge, PriorityBadge } from '../components/badges';
import { testCases as initialTestCases, type TestCase } from '../data/workspace';
import { NewTestCaseModal } from './Newtestcasemodal';

type TestCasesPageProps = {
  createActionEventId?: number;
};

export function TestCasesPage({ createActionEventId = 0 }: TestCasesPageProps) {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'VIEWER';
  const [cases, setCases] = useState<TestCase[]>(initialTestCases);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (createActionEventId > 0 && !isReadOnly) {
      const timeoutId = window.setTimeout(() => setModalOpen(true), 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [createActionEventId, isReadOnly]);

  function handleCreate(testCase: TestCase) {
    setCases((current) => [testCase, ...current]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Case library</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Test Cases
          </h1>
        </div>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          disabled={isReadOnly}
          onClick={() => setModalOpen(true)}
          title={isReadOnly ? 'Viewer mode is read-only' : 'Create test case'}
          type="button"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Test case
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 sm:max-w-md">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
            placeholder="Search test cases"
            type="search"
          />
        </label>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
          type="button"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filters
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        {cases.slice(0, 2).map((testCase) => (
          <article
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            key={testCase.id}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <ListChecks className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {testCase.id}
                  </span>
                  <PriorityBadge priority={testCase.priority} />
                  <CaseStatusBadge status={testCase.status} />
                </div>
                <h2 className="mt-2 text-sm font-semibold text-zinc-950 dark:text-white">
                  {testCase.title}
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {testCase.suite} - {testCase.steps} steps
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Case table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-900/70 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Suite</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Steps</th>
                <th className="px-4 py-3">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {cases.map((testCase) => (
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60" key={testCase.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-950 dark:text-white">{testCase.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{testCase.id}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{testCase.suite}</td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={testCase.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <CaseStatusBadge status={testCase.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{testCase.steps}</td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {testCase.tags.map((tag) => (
                        <span
                          className="inline-flex h-6 items-center gap-1 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
                          key={tag}
                        >
                          <Tag className="h-3 w-3" aria-hidden="true" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NewTestCaseModal
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
        open={modalOpen}
      />
    </div>
  );
}

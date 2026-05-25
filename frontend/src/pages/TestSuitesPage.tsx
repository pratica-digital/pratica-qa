import { Filter, Layers3, Plus, Search } from 'lucide-react';
import { SuiteStatusBadge } from '../components/badges';
import { testSuites } from '../data/workspace';

export function TestSuitesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Test design</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Test Suites
          </h1>
        </div>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          type="button"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Suite
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 sm:max-w-md">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
            placeholder="Search suites"
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {testSuites.map((suite) => (
          <article
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            key={suite.name}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <Layers3 className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                    {suite.name}
                  </h2>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{suite.project}</p>
                </div>
              </div>
              <SuiteStatusBadge status={suite.status} />
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Coverage</span>
                <span>{suite.coverage}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-900">
                <div
                  className="h-2 rounded-full bg-sky-500"
                  style={{ width: `${suite.coverage}%` }}
                />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">{suite.cases}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Cases</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">{suite.failures}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Failures</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Suite matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-900/70 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Suite</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Coverage</th>
                <th className="px-4 py-3">Failures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {testSuites.map((suite) => (
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60" key={suite.name}>
                  <td className="px-4 py-3 font-medium text-zinc-950 dark:text-white">{suite.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{suite.project}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{suite.owner}</td>
                  <td className="px-4 py-3">
                    <SuiteStatusBadge status={suite.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{suite.coverage}%</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{suite.failures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

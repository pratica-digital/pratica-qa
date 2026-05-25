import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Filter,
  FolderOpen,
  Layers3,
  ListChecks,
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { CaseStatusBadge, ProjectStatusBadge } from '../components/badges';
import type { PageId } from '../data/workspace';
import { activityItems, projects, testCases, testSuites } from '../data/workspace';

type DashboardPageProps = {
  onNavigate: (page: PageId) => void;
};

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const readyCases = testCases.filter((testCase) => testCase.status === 'Ready').length;
  const failures = testSuites.reduce((total, suite) => total + suite.failures, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">QA overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Release readiness
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            type="button"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filters
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            type="button"
          >
            This week
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          delta="+12%"
          icon={FolderOpen}
          label="Active projects"
          tone="sky"
          value={String(projects.filter((project) => project.status !== 'Archived').length)}
        />
        <MetricCard
          delta="+8%"
          icon={Layers3}
          label="Test suites"
          tone="emerald"
          value={String(testSuites.length)}
        />
        <MetricCard
          delta="+21"
          icon={ListChecks}
          label="Ready cases"
          tone="amber"
          value={String(readyCases)}
        />
        <MetricCard
          delta="-4"
          icon={Activity}
          label="Open failures"
          tone="rose"
          value={String(failures)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Projects</h2>
            <button
              className="text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              onClick={() => onNavigate('projects')}
              type="button"
            >
              View all
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-900/70 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Suites</th>
                  <th className="px-4 py-3">Cases</th>
                  <th className="px-4 py-3">Pass rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {projects.map((project) => (
                  <tr key={project.key} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                          {project.key}
                        </span>
                        <div>
                          <p className="font-medium text-zinc-950 dark:text-white">{project.name}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{project.owner}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{project.suites}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{project.cases}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 rounded-full bg-zinc-100 dark:bg-zinc-900">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${project.passRate}%` }}
                          />
                        </div>
                        <span className="text-zinc-600 dark:text-zinc-300">{project.passRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Run summary</h2>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-semibold text-zinc-950 dark:text-white">88%</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Passed</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-950 dark:text-white">9</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-950 dark:text-white">4</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Blocked</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Recent activity</h2>
              <Clock3 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            </div>
            <div className="mt-4 space-y-3">
              {activityItems.map((item) => (
                <div className="flex gap-3" key={item}>
                  <Circle className="mt-1 h-3 w-3 fill-zinc-300 text-zinc-300 dark:fill-zinc-700 dark:text-zinc-700" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Case queue</h2>
            <div className="mt-4 space-y-3">
              {testCases.slice(0, 3).map((testCase) => (
                <div className="flex items-center justify-between gap-3" key={testCase.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                      {testCase.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{testCase.id}</p>
                  </div>
                  <CaseStatusBadge status={testCase.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

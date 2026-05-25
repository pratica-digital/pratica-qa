import { Filter, FolderOpen, MoreHorizontal, Plus, Search } from 'lucide-react';
import { ProjectStatusBadge } from '../components/badges';
import { projects } from '../data/workspace';

export function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Portfolio</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Projects
          </h1>
        </div>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          type="button"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Project
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 sm:max-w-md">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
            placeholder="Search projects"
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

      <section className="grid gap-3 md:grid-cols-3">
        {projects.map((project) => (
          <article
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            key={project.key}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  {project.key}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                    {project.name}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{project.owner}</p>
                </div>
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-white"
                title="Project actions"
                type="button"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <ProjectStatusBadge status={project.status} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{project.updatedAt}</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">{project.suites}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Suites</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">{project.cases}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Cases</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-950 dark:text-white">{project.passRate}%</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Pass</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Project inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-900/70 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Suites</th>
                <th className="px-4 py-3">Cases</th>
                <th className="px-4 py-3">Pass rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {projects.map((project) => (
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60" key={project.key}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                      <span className="font-medium text-zinc-950 dark:text-white">{project.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{project.owner}</td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{project.suites}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{project.cases}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{project.passRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

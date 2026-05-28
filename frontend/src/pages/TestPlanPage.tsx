import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, FolderOpen, MoreHorizontal, Plus, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { ProjectStatusBadge } from '../components/badges';
import { ApiError, projectsApi } from '../lib/api';
import type { CreateProjectPayload, ProjectSummary } from '../types/testRun';
import { NewProjectModal } from './NewProjectModal';

type ProjectsPageProps = {
  createActionEventId?: number;
};

function getUpdatedAt(project: ProjectSummary) {
  if (!project.updatedAt) {
    return 'No updates';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(project.updatedAt));
}

export function ProjectsPage({ createActionEventId = 0 }: ProjectsPageProps) {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const nextProjects = await projectsApi.list(token);
      setProjects(nextProjects);
    } catch (fetchError) {
      if (fetchError instanceof ApiError && fetchError.status === 401) {
        setError('Your session expired. Sign out and sign in again.');
      } else {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load projects.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchData]);

  useEffect(() => {
    if (createActionEventId > 0 && isAdmin) {
      const timeoutId = window.setTimeout(() => setModalOpen(true), 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [createActionEventId, isAdmin]);

  const visibleProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return projects;
    }

    return projects.filter((project) => {
      const searchable = [project.name, project.key, project.description, project.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [projects, search]);

  async function handleCreate(payload: CreateProjectPayload) {
    if (!token) {
      return;
    }

    const createdProject = await projectsApi.create(token, payload);
    setProjects((current) => [createdProject, ...current]);
    setSuccess('Project created.');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Portfolio</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Projects
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            disabled={isLoading}
            onClick={() => void fetchData()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            disabled={!isAdmin}
            onClick={() => setModalOpen(true)}
            title={isAdmin ? 'Create project' : 'Only admins can create projects'}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Project
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 sm:max-w-md">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects"
            type="search"
            value={search}
          />
        </label>
        <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <Filter className="h-4 w-4" aria-hidden="true" />
          {visibleProjects.length} shown
        </span>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Loading projects
        </div>
      ) : visibleProjects.length > 0 ? (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            {visibleProjects.map((project) => (
              <article
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                key={project.id}
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
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {project.description || project.id}
                      </p>
                    </div>
                  </div>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-900 dark:hover:text-white"
                    disabled={!isAdmin}
                    title="Project actions"
                    type="button"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {project.status ? <ProjectStatusBadge status={project.status} /> : null}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{getUpdatedAt(project)}</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-zinc-950 dark:text-white">
                      {project._count?.suites ?? 0}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Suites</p>
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-950 dark:text-white">
                      {project._count?.testRuns ?? 0}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Runs</p>
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-950 dark:text-white">
                      {project._count?.testPlans ?? 0}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Plans</p>
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
                    <th className="px-4 py-3">Key</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Suites</th>
                    <th className="px-4 py-3">Runs</th>
                    <th className="px-4 py-3">Plans</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {visibleProjects.map((project) => (
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60" key={project.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                          <span className="font-medium text-zinc-950 dark:text-white">{project.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{project.key}</td>
                      <td className="px-4 py-3">
                        {project.status ? <ProjectStatusBadge status={project.status} /> : null}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {project._count?.suites ?? 0}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {project._count?.testRuns ?? 0}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {project._count?.testPlans ?? 0}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {getUpdatedAt(project)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">No projects found</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create a project before adding suites or test cases.
          </p>
        </div>
      )}

      <NewProjectModal
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
        open={modalOpen}
      />
    </div>
  );
}

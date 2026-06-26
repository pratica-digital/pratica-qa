import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, FolderOpen, MoreHorizontal, Plus, RefreshCw, Search } from 'lucide-react';
import { canManageTests } from '../auth/permissions';
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

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(project.updatedAt));
}

export function ProjectsPage({ createActionEventId = 0 }: ProjectsPageProps) {
  const { token, user } = useAuth();
  const canManageTestAssets = canManageTests(user);
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
        setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível carregar os projetos.');
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
    if (createActionEventId > 0 && canManageTestAssets) {
      const timeoutId = window.setTimeout(() => setModalOpen(true), 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [canManageTestAssets, createActionEventId]);

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
          <p className="text-sm font-medium text-slate-500">Portfolio</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Projects
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => void fetchData()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canManageTestAssets}
            onClick={() => setModalOpen(true)}
            title={canManageTestAssets ? 'Criar projeto' : 'Requer permissão de gestão de testes'}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Project
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:max-w-md">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar projetos"
            type="search"
            value={search}
          />
        </label>
        <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600">
          <Filter className="h-4 w-4" aria-hidden="true" />
          {visibleProjects.length} shown
        </span>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading projects
        </div>
      ) : visibleProjects.length > 0 ? (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            {visibleProjects.map((project) => (
              <article
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                key={project.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                      {project.key}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-slate-950">
                        {project.name}
                      </h2>
                      <p className="truncate text-xs text-slate-500">
                        {project.description || project.id}
                      </p>
                    </div>
                  </div>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canManageTestAssets}
                    title="Project actions"
                    type="button"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {project.status ? <ProjectStatusBadge status={project.status} /> : null}
                  <span className="text-xs text-slate-500">{getUpdatedAt(project)}</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {project._count?.suites ?? 0}
                    </p>
                    <p className="text-xs text-slate-500">Suites</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">
                      {project._count?.testRuns ?? 0}
                    </p>
                    <p className="text-xs text-slate-500">Runs</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">
                      {project._count?.testPlans ?? 0}
                    </p>
                    <p className="text-xs text-slate-500">Plans</p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-950">Project inventory</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-100 text-xs font-medium uppercase text-slate-700">
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
                <tbody className="divide-y divide-slate-200">
                  {visibleProjects.map((project) => (
                    <tr className="hover:bg-slate-50" key={project.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          <span className="font-medium text-slate-950">{project.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{project.key}</td>
                      <td className="px-4 py-3">
                        {project.status ? <ProjectStatusBadge status={project.status} /> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {project._count?.suites ?? 0}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {project._count?.testRuns ?? 0}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {project._count?.testPlans ?? 0}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
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
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">No projects found</h2>
          <p className="mt-1 text-sm text-slate-500">
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

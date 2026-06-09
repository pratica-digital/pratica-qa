import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, FolderOpen, Layers3, PlaySquare, Trash2, X } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { projectsApi, testPlansApi, testRunsApi, testSuitesApi } from '../../lib/api';
import type { ManagedTestSuite, ProjectSummary, TestPlan, TestRun } from '../../types/testRun';

type ProjectDetailPanelProps = {
  project: ProjectSummary;
  onClose: () => void;
  onDelete?: (project: ProjectSummary) => void;
};

function formatUpdatedAt(value?: string) {
  if (!value) {
    return 'No updates';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ProjectDetailPanel({ project, onClose, onDelete }: ProjectDetailPanelProps) {
  const { token } = useAuth();
  const [projectDetail, setProjectDetail] = useState(project);
  const [suites, setSuites] = useState<ManagedTestSuite[]>([]);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let mounted = true;

    void (async () => {
      setIsLoading(true);
      setError('');

      try {
        const [nextProject, nextSuites, nextPlans, nextRuns] = await Promise.all([
          projectsApi.get(token, project.id),
          testSuitesApi.list(token, { projectId: project.id }),
          testPlansApi.list(token, { projectId: project.id }),
          testRunsApi.list(token, { projectId: project.id }),
        ]);

        if (!mounted) {
          return;
        }

        setProjectDetail(nextProject);
        setSuites(nextSuites);
        setPlans(nextPlans);
        setRuns(nextRuns);
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load project details.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [project.id, token]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-white dark:bg-zinc-950">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
              {projectDetail.name}
            </h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {projectDetail.key ?? projectDetail.id}
            </p>
          </div>
          {onDelete ? (
            <button
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
              onClick={() => onDelete(projectDetail)}
              title="Delete project"
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          ) : null}
          <button
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {error ? (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          <section className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 md:col-span-2">
              <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Project info</p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                {projectDetail.description || 'No description'}
              </p>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Updated {formatUpdatedAt(projectDetail.updatedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Suites</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
                {projectDetail._count?.suites ?? suites.length}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Plans / Runs</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
                {projectDetail._count?.testPlans ?? plans.length}/{projectDetail._count?.testRuns ?? runs.length}
              </p>
            </div>
          </section>

          {isLoading ? (
            <p className="mt-5 rounded-lg border border-zinc-200 bg-white px-3 py-4 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              Loading project details
            </p>
          ) : null}

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <section>
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Test suites</h3>
              </div>
              <div className="mt-3 space-y-2">
                {suites.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No suites.
                  </p>
                ) : null}
                {suites.map((suite) => (
                  <article
                    className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                    key={suite.id}
                  >
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">{suite.name}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {suite._count?.testCases ?? 0} cases
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Test plans</h3>
              </div>
              <div className="mt-3 space-y-2">
                {plans.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No plans.
                  </p>
                ) : null}
                {plans.map((plan) => (
                  <article
                    className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                    key={plan.id}
                  >
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">{plan.name}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      v{plan.version} - {plan.sections?.length ?? 0} sections
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2">
                <PlaySquare className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Test runs</h3>
              </div>
              <div className="mt-3 space-y-2">
                {runs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No runs.
                  </p>
                ) : null}
                {runs.map((run) => (
                  <article
                    className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                    key={run.id}
                  >
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">{run.name}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {run.status} - {run.results?.length ?? 0} results
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

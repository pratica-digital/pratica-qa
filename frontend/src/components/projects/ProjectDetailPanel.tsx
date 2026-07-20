import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, FolderOpen, Layers3, PlaySquare, X } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { ActionMenu } from '../ActionMenu';
import { MarkdownContent } from '../MarkdownContent';
import { projectsApi, testPlansApi, testRunsApi, testSuitesApi } from '../../lib/api';
import type { ManagedTestSuite, ProjectSummary, TestPlan, TestRun } from '../../types/testRun';

type ProjectDetailPanelProps = {
  project: ProjectSummary;
  onClose: () => void;
  onDelete?: (project: ProjectSummary) => void;
};

function formatUpdatedAt(value?: string) {
  if (!value) {
    return 'Sem atualizações';
  }

  return new Intl.DateTimeFormat('pt-BR', {
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
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os detalhes do projeto.');
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
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-950">
              {projectDetail.name}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {projectDetail.key ?? projectDetail.id}
            </p>
          </div>
          {onDelete ? (
            <ActionMenu
              ariaLabel="Ações do projeto"
              items={[
                {
                  label: 'Excluir',
                  onSelect: () => onDelete(projectDetail),
                  title: 'Excluir projeto',
                  tone: 'danger',
                },
              ]}
            />
          ) : null}
          <button
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            title="Fechar"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {error ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <section className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
              <p className="text-xs font-medium uppercase text-slate-500">Informações do projeto</p>
              <MarkdownContent
                className="mt-2 text-sm text-slate-700"
                content={projectDetail.description}
                fallback={<p className="mt-2 text-sm text-slate-700">Sem descrição</p>}
              />
              <p className="mt-3 text-xs text-slate-500">
                Atualizado {formatUpdatedAt(projectDetail.updatedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">Suítes</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {projectDetail._count?.suites ?? suites.length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">Planos / Execuções</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {projectDetail._count?.testPlans ?? plans.length}/{projectDetail._count?.testRuns ?? runs.length}
              </p>
            </div>
          </section>

          {isLoading ? (
            <p className="mt-5 rounded-lg border border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">
              Carregando detalhes do projeto
            </p>
          ) : null}

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <section>
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-950">Suítes de teste</h3>
              </div>
              <div className="mt-3 space-y-2">
                {suites.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                    Nenhuma suíte.
                  </p>
                ) : null}
                {suites.map((suite) => (
                  <article
                    className="rounded-lg border border-slate-200 bg-white p-3"
                    key={suite.id}
                  >
                    <p className="text-sm font-medium text-slate-950">{suite.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {suite._count?.testCases ?? 0} caso{(suite._count?.testCases ?? 0) === 1 ? '' : 's'}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-950">Planos de teste</h3>
              </div>
              <div className="mt-3 space-y-2">
                {plans.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                    Nenhum plano.
                  </p>
                ) : null}
                {plans.map((plan) => (
                  <article
                    className="rounded-lg border border-slate-200 bg-white p-3"
                    key={plan.id}
                  >
                    <p className="text-sm font-medium text-slate-950">{plan.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      v{plan.version} - {plan.sections?.length ?? 0} sections
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2">
                <PlaySquare className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-950">Execuções</h3>
              </div>
              <div className="mt-3 space-y-2">
                {runs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                    Nenhuma execução.
                  </p>
                ) : null}
                {runs.map((run) => (
                  <article
                    className="rounded-lg border border-slate-200 bg-white p-3"
                    key={run.id}
                  >
                    <p className="text-sm font-medium text-slate-950">{run.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
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

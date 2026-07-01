import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { projectsApi, testPlansApi } from '../../lib/api';
import type { ProjectSummary, TestPlan } from '../../types/testRun';

type SectionDraft = {
  clientId: string;
  title: string;
  content: string;
};

type Props = {
  onCreated?: (plan: TestPlan) => void;
};

function createBlankSection(): SectionDraft {
  return {
    clientId: `section-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: '',
    content: '',
  };
}

export function TestPlanCreator({ onCreated }: Props) {
  const { token } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    let mounted = true;
    void (async () => {
      try {
        const list = await projectsApi.list(token);
        if (mounted) setProjects(list);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  function updateSection(index: number, field: 'title' | 'content', value: string) {
    setSections((current) =>
      current.map((section, currentIndex) =>
        currentIndex === index ? { ...section, [field]: value } : section,
      ),
    );
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((current) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function removeSection(index: number) {
    setSections((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleCreate() {
    if (!token) {
      setError('Autenticação obrigatória');
      return;
    }

    if (!projectId) {
      setError('Selecione um projeto');
      return;
    }

    if (!name.trim() || !version.trim()) {
      setError('Nome e versão são obrigatórios');
      return;
    }

    const normalizedSections = sections.map((section) => ({
      title: section.title.trim(),
      content: section.content.trim(),
    }));

    if (normalizedSections.length === 0) {
      setError('Adicione pelo menos uma seção');
      return;
    }

    if (normalizedSections.length > 30) {
      setError('Planos de teste podem ter até 30 seções');
      return;
    }

    if (normalizedSections.some((section) => section.title.length === 0)) {
      setError('O título da seção é obrigatório');
      return;
    }

    if (normalizedSections.some((section) => section.title.length > 160)) {
      setError('O título da seção deve ter no máximo 160 caracteres');
      return;
    }

    if (normalizedSections.some((section) => section.content.length === 0)) {
      setError('O conteúdo da seção é obrigatório');
      return;
    }

    if (normalizedSections.some((section) => section.content.length > 8000)) {
      setError('O conteúdo da seção deve ter no máximo 8000 caracteres');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const created = await testPlansApi.create(token, {
        projectId,
        name: name.trim(),
        version: version.trim(),
        sections: normalizedSections,
      });

      onCreated?.(created);
      setName('');
      setVersion('1.0');
      setSections([]);
      setProjectId('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o plano de teste');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <label className="block text-sm font-medium text-slate-700">Projeto</label>
      <select
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
        disabled={isLoading}
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
      >
        <option value="">Selecione um projeto...</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <label className="block text-sm font-medium text-slate-700">Nome</label>
      <input
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
        disabled={isLoading}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="block text-sm font-medium text-slate-700">Versão</label>
      <input
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
        disabled={isLoading}
        value={version}
        onChange={(e) => setVersion(e.target.value)}
      />

      <section className="pt-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-950">Seções</h3>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={() => setSections((current) => [...current, createBlankSection()])}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar seção
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {sections.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
              Nenhuma seção definida.
            </p>
          ) : null}

          {sections.map((section, index) => (
            <div
              className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[2.5rem_1fr_7.5rem]"
              key={section.clientId}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-600">
                {index + 1}
              </span>

              <div className="space-y-2">
                <input
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={isLoading}
                  onChange={(event) => updateSection(index, 'title', event.target.value)}
                  placeholder="Título da seção"
                  value={section.title}
                />
                <textarea
                  className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={isLoading}
                  onChange={(event) => updateSection(index, 'content', event.target.value)}
                  placeholder="Descrição da seção"
                  value={section.content}
                />
              </div>

              <div className="flex h-10 items-center justify-end gap-1">
                <button
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={isLoading || index === 0}
                  onClick={() => moveSection(index, -1)}
                  title="Mover para cima"
                  type="button"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={isLoading || index === sections.length - 1}
                  onClick={() => moveSection(index, 1)}
                  title="Mover para baixo"
                  type="button"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={isLoading}
                  onClick={() => removeSection(index)}
                  title="Remover seção"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          className="inline-flex items-center rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          onClick={handleCreate}
          type="button"
          disabled={isLoading}
        >
          {isLoading ? 'Criando...' : 'Criar plano de teste'}
        </button>
      </div>
    </div>
  );
}

export default TestPlanCreator;

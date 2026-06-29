import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ChevronRight,
  Filter,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { canManageTests } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { ActionMenu } from '../components/ActionMenu';
import { ProjectStatusBadge } from '../components/badges';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { ApiError, projectsApi, resolveApiAssetUrl } from '../lib/api';
import type {
  CreateProjectPayload,
  ProjectStatus,
  ProjectSummary,
  UpdateProjectPayload,
  ProjectCategory,
} from '../types/testRun';
import { PROJECT_CATEGORY_MAP, PROJECT_CATEGORY_ORDER } from '../types/testRun';

type ProjectsPageProps = {
  createActionEventId?: number;
};

type ProjectForm = {
  name: string;
  description: string;
  status: ProjectStatus;
  category: ProjectCategory;
  imageFile: File | null;
  removeImage: boolean;
};

type ProjectFormErrors = Partial<Record<'name' | 'category' | 'imageFile', string>>;

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
};

const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const maxImageSize = 5 * 1024 * 1024;

function getUpdatedAt(project: ProjectSummary) {
  if (!project.updatedAt) {
    return 'Sem atualizações';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(project.updatedAt));
}

function ProjectCover({ project }: { project: ProjectSummary }) {
  const imageUrl = resolveApiAssetUrl(project.imageUrl);

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      {imageUrl ? (
        <img alt="" className="w-full max-h-72 object-contain bg-slate-100" src={imageUrl} />
      ) : (
        <div className="flex h-52 w-full items-center justify-center text-slate-400">
          <ImageIcon className="h-10 w-10" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function Field({ label, required = false, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-blue-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function getInitialForm(project?: ProjectSummary | null): ProjectForm {
  if (!project) {
    return {
      name: '',
      description: '',
      status: 'ACTIVE',
      category: 'BAKERY_OVENS',
      imageFile: null,
      removeImage: false,
    };
  }

  return {
    name: project.name,
    description: project.description ?? '',
    status: project.status ?? 'ACTIVE',
    category: project.category ?? 'BAKERY_OVENS',
    imageFile: null,
    removeImage: false,
  };
}

function ProjectFormModal({
  project,
  onClose,
  onCreate,
  onUpdate,
}: {
  project?: ProjectSummary | null;
  onClose: () => void;
  onCreate: (payload: CreateProjectPayload) => Promise<void>;
  onUpdate: (project: ProjectSummary, payload: UpdateProjectPayload) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<ProjectForm>(() => getInitialForm(project));
  const [errors, setErrors] = useState<ProjectFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [objectPreviewUrl, setObjectPreviewUrl] = useState('');
  const isEditing = Boolean(project);
  const existingImageUrl = form.removeImage ? '' : resolveApiAssetUrl(project?.imageUrl);
  const previewUrl = objectPreviewUrl || existingImageUrl;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!objectPreviewUrl) {
      return undefined;
    }

    return () => URL.revokeObjectURL(objectPreviewUrl);
  }, [objectPreviewUrl]);

  function setField<FieldName extends keyof ProjectForm>(
    field: FieldName,
    value: ProjectForm[FieldName],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: ProjectFormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Nome obrigatório';
    }

    if (!form.category) {
      nextErrors.category = 'Categoria obrigatória';
    }

    if (form.imageFile && !acceptedImageTypes.includes(form.imageFile.type)) {
      nextErrors.imageFile = 'Formatos aceitos: JPG, PNG, WEBP ou GIF';
    }

    if (form.imageFile && form.imageFile.size > maxImageSize) {
      nextErrors.imageFile = 'A imagem deve ter no máximo 5 MB';
    }

    return nextErrors;
  }

  function handleImageChange(file: File | undefined) {
    if (!file) {
      return;
    }

    setForm((current) => ({
      ...current,
      imageFile: file,
      removeImage: false,
    }));
    setErrors((current) => ({ ...current, imageFile: undefined }));
    setObjectPreviewUrl(URL.createObjectURL(file));
  }

  function clearImage() {
    setForm((current) => ({
      ...current,
      imageFile: null,
      removeImage: Boolean(project?.imageUrl),
    }));
    setObjectPreviewUrl('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit() {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      if (project) {
        await onUpdate(project, {
          name: form.name.trim(),
          description: form.description.trim(),
          status: form.status,
          category: form.category,
          imageFile: form.imageFile,
          removeImage: form.removeImage,
        });
      } else {
        await onCreate({
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category,
          imageFile: form.imageFile,
        });
      }

      onClose();
    } catch (projectError) {
      setSubmitError(projectError instanceof Error ? projectError.message : 'Não foi possível salvar o projeto.');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-950">
                {isEditing ? 'Editar projeto' : 'Novo projeto'}
              </h2>
              <p className="truncate text-xs text-slate-400">
                {isEditing ? 'Atualize os detalhes e a capa do projeto' : 'Crie o espaço de trabalho de QA'}
              </p>
            </div>
            <button
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={onClose}
              title="Fechar modal"
              type="button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <Field label="Capa do projeto" hint="JPG, PNG, WEBP ou GIF até 5 MB">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {previewUrl ? (
                  <img alt="" className="w-full max-h-72 object-contain bg-slate-100" src={previewUrl} />
                ) : (
                  <div className="flex h-52 w-full items-center justify-center bg-slate-100 text-slate-400">
                    <ImageIcon className="h-10 w-10" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  accept={acceptedImageTypes.join(',')}
                  className="hidden"
                  onChange={(event) => handleImageChange(event.target.files?.[0])}
                  ref={fileInputRef}
                  type="file"
                />
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white transition hover:bg-slate-700"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Enviar imagem
                </button>
                {previewUrl ? (
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-3 text-sm font-medium text-white transition hover:bg-red-700"
                    onClick={clearImage}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Remover imagem
                  </button>
                ) : null}
              </div>
              {errors.imageFile ? (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.imageFile}
                </p>
              ) : null}
            </Field>

            <Field label="Nome do projeto" required>
              <input
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                onChange={(event) => setField('name', event.target.value)}
                placeholder="App Web do Cliente"
                value={form.name}
              />
              {errors.name ? (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.name}
                </p>
              ) : null}
            </Field>

            <Field label="Descrição" hint="Escopo ou contexto do produto, opcional">
              <textarea
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                onChange={(event) => setField('description', event.target.value)}
                placeholder="Projeto principal de QA para a experiência web do cliente"
                rows={3}
                value={form.description}
              />
            </Field>

            <Field label="Categoria" required>
              <select
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                onChange={(event) => setField('category', event.target.value as ProjectCategory)}
                value={form.category}
              >
                <option value="">Selecione uma categoria</option>
                <option value="BAKERY_OVENS">Fornos de Panificação</option>
                <option value="COMBI_OVENS">Fornos Combinados</option>
                <option value="SPEED_OVENS">Speed Ovens</option>
              </select>
              {errors.category ? (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" /> {errors.category}
                </p>
              ) : null}
            </Field>

            {isEditing ? (
              <Field label="Status">
                <select
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  onChange={(event) => setField('status', event.target.value as ProjectStatus)}
                  value={form.status}
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="ARCHIVED">Arquivado</option>
                </select>
              </Field>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
            <p className="text-xs text-red-500">{submitError}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                className="h-9 rounded-lg bg-slate-600 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
                disabled={submitting}
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                type="button"
              >
                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                {submitting ? 'Salvando' : isEditing ? 'Salvar alterações' : 'Criar projeto'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ProjectDetailsPanel({
  project,
  canManage,
  onClose,
  onDelete,
  onEdit,
}: {
  project: ProjectSummary;
  canManage: boolean;
  onClose: () => void;
  onDelete: (project: ProjectSummary) => void;
  onEdit: (project: ProjectSummary) => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-slate-950">{project.name}</h2>
              <p className="truncate text-xs text-slate-500">
                Atualizado {getUpdatedAt(project)}
              </p>
            </div>
            {canManage ? (
              <ActionMenu
                ariaLabel="Ações do projeto"
                items={[
                  {
                    label: 'Editar',
                    onSelect: () => onEdit(project),
                    title: 'Editar projeto',
                  },
                  {
                    label: 'Excluir',
                    onSelect: () => onDelete(project),
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
            <ProjectCover project={project} />

            <section className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                <p className="text-xs font-medium uppercase text-slate-500">Informações do projeto</p>
                <p className="mt-2 text-sm text-slate-700">
                  {project.description || 'Sem descrição'}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {project.status ? <ProjectStatusBadge status={project.status} /> : null}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Suítes</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {project._count?.suites ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Planos / Execuções</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {project._count?.testPlans ?? 0}/{project._count?.testRuns ?? 0}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ProjectsPage({ createActionEventId = 0 }: ProjectsPageProps) {
  const { token, user } = useAuth();
  const canManageTestAssets = canManageTests(user);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [projectPendingDelete, setProjectPendingDelete] = useState<ProjectSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
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
        setError('Sua sessão expirou. Saia e entre novamente.');
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
      const searchable = [project.name, project.description, project.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [projects, search]);

  const projectsByCategory = useMemo(() => {
    const grouped: Record<ProjectCategory, ProjectSummary[]> = {
      BAKERY_OVENS: [],
      COMBI_OVENS: [],
      SPEED_OVENS: [],
    };

    visibleProjects.forEach((project) => {
      const category = project.category ?? 'BAKERY_OVENS';
      grouped[category].push(project);
    });

    return grouped;
  }, [visibleProjects]);

  async function handleCreate(payload: CreateProjectPayload) {
    if (!token) {
      return;
    }

    const createdProject = await projectsApi.create(token, payload);
    setProjects((current) => [createdProject, ...current]);
    setSuccess('Projeto criado.');
  }

  async function handleUpdate(project: ProjectSummary, payload: UpdateProjectPayload) {
    if (!token) {
      return;
    }

    const updatedProject = await projectsApi.update(token, project.id, payload);

    setProjects((current) =>
      current.map((item) => (item.id === updatedProject.id ? updatedProject : item)),
    );

    if (selectedProject?.id === updatedProject.id) {
      setSelectedProject(updatedProject);
    }

    setSuccess('Projeto atualizado.');
  }

  function requestProjectEdit(project: ProjectSummary) {
    setError('');
    setSuccess('');
    setEditingProject(project);
  }

  function requestProjectDelete(project: ProjectSummary) {
    setError('');
    setSuccess('');
    setProjectPendingDelete(project);
  }

  async function handleDeleteProject() {
    if (!token || !projectPendingDelete) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      await projectsApi.remove(token, projectPendingDelete.id);
      setProjects((current) => current.filter((project) => project.id !== projectPendingDelete.id));

      if (selectedProject?.id === projectPendingDelete.id) {
        setSelectedProject(null);
      }

      setProjectPendingDelete(null);
      setSuccess('Projeto excluído.');
    } catch (deleteError) {
      setProjectPendingDelete(null);
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o projeto.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Equipamentos
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
            
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canManageTestAssets}
            onClick={() => setModalOpen(true)}
            title={canManageTestAssets ? 'Criar projeto' : 'Requer permissão de gestão de testes'}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Equipamentos
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
          {visibleProjects.length} exibido{visibleProjects.length === 1 ? '' : 's'}
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
          Carregando projetos
        </div>
      ) : visibleProjects.length > 0 ? (
        <>
          {PROJECT_CATEGORY_ORDER.map((category) => {
            const projectsInCategory = projectsByCategory[category];

            if (projectsInCategory.length === 0) {
              return null;
            }

            return (
              <section key={category} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {PROJECT_CATEGORY_MAP[category]}
                  </h2>
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600">
                    {projectsInCategory.length} {projectsInCategory.length === 1 ? 'Equipamento' : 'Equipamentos'}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {projectsInCategory.map((project) => (
                    <article
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      role="button"
                      tabIndex={0}
                    >
                      <ProjectCover project={project} />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-950">
                            {project.name}
                          </h3>
                          <p className="truncate text-xs text-slate-500">
                            {project.description || project.id}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <ActionMenu
                            ariaLabel="Ações do projeto"
                            disabled={!canManageTestAssets}
                            items={[
                              {
                                label: 'Editar',
                                onSelect: () => requestProjectEdit(project),
                                title: 'Editar projeto',
                              },
                              {
                                label: 'Excluir',
                                onSelect: () => requestProjectDelete(project),
                                title: 'Excluir projeto',
                                tone: 'danger',
                              },
                            ]}
                          />
                          <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {project._count?.suites ?? 0}
                          </p>
                          <p className="text-xs text-slate-500">Suítes</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">
                            {project._count?.testRuns ?? 0}
                          </p>
                          <p className="text-xs text-slate-500">Execuções</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">
                            {project._count?.testPlans ?? 0}
                          </p>
                          <p className="text-xs text-slate-500">Planos</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-950">Inventário de projetos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-100 text-xs font-medium uppercase text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Equipamento</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Suítes</th>
                    <th className="px-4 py-3">Execuções</th>
                    <th className="px-4 py-3">Planos</th>
                    <th className="px-4 py-3">Atualizado</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleProjects.map((project) => (
                    <tr
                      className="cursor-pointer hover:bg-slate-50"
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          <span className="font-medium text-slate-950">{project.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {project.category ? PROJECT_CATEGORY_MAP[project.category] : 'Não categorizado'}
                      </td>
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
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          ariaLabel="Ações do projeto"
                          disabled={!canManageTestAssets}
                          items={[
                            {
                              label: 'Editar',
                              onSelect: () => requestProjectEdit(project),
                              title: 'Editar projeto',
                            },
                            {
                              label: 'Excluir',
                              onSelect: () => requestProjectDelete(project),
                              title: 'Excluir projeto',
                              tone: 'danger',
                            },
                          ]}
                        />
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
          <h2 className="text-sm font-semibold text-slate-950">Nenhum projeto encontrado</h2>
          <p className="mt-1 text-sm text-slate-500">
            Crie um projeto antes de adicionar suítes ou casos de teste.
          </p>
        </div>
      )}

      {modalOpen ? (
        <ProjectFormModal
          key="new-project"
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      ) : null}

      {editingProject ? (
        <ProjectFormModal
          key={editingProject.id}
          onClose={() => setEditingProject(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          project={editingProject}
        />
      ) : null}

      {selectedProject ? (
        <ProjectDetailsPanel
          key={`${selectedProject.id}:${selectedProject.updatedAt ?? ''}:${selectedProject.imageUrl ?? ''}`}
          canManage={canManageTestAssets}
          onClose={() => setSelectedProject(null)}
          onDelete={requestProjectDelete}
          onEdit={(project) => {
            setSelectedProject(null);
            requestProjectEdit(project);
          }}
          project={selectedProject}
        />
      ) : null}

      {projectPendingDelete ? (
        <DeleteConfirmationModal
          description="Isso removerá o projeto e todas as suítes, casos de teste, planos de teste e execuções relacionados."
          loading={isDeleting}
          onCancel={() => setProjectPendingDelete(null)}
          onConfirm={() => void handleDeleteProject()}
          title="Excluir projeto?"
        />
      ) : null}
    </div>
  );
}

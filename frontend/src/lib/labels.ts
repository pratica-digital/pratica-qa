import type {
  ProjectStatus,
  TestResultStatus,
  TestRunStatus,
  UserRole,
  UserStatus,
} from '../types/testRun';

export const pageLabels = {
  dashboard: 'Painel',
  projects: 'Projetos',
  'test-plans': 'Planos de Teste',
  'test-suites': 'Suítes de Teste',
  'test-cases': 'Casos de Teste',
  'test-runs': 'Execuções',
  users: 'Usuários',
  profile: 'Perfil',
} as const;

export const testRunStatusLabels: Record<TestRunStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
};

export const testResultStatusLabels: Record<TestResultStatus, string> = {
  PASSED: 'Aprovado',
  FAILED: 'Falhou',
  SKIPPED: 'Ignorado',
  PENDING: 'Não executado',
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  ACTIVE: 'Ativo',
  ARCHIVED: 'Arquivado',
};

export const GENERAL_SUITE_PROJECT_LABEL = 'Geral';

type SuiteProjectSource = {
  projects?: Array<{
    id?: string;
    key?: string | null;
    name?: string | null;
  }>;
  project?: {
    id?: string;
    key?: string | null;
    name?: string | null;
  } | null;
  projectId?: string | null;
};

export function suiteProjectIds(suite: SuiteProjectSource) {
  if (suite.projects?.length) {
    return suite.projects.map((project) => project.id).filter((id): id is string => Boolean(id));
  }

  return suite.project?.id ? [suite.project.id] : suite.projectId ? [suite.projectId] : [];
}

export function suiteBelongsToProject(suite: SuiteProjectSource, projectId: string) {
  const projectIds = suiteProjectIds(suite);
  return projectIds.length === 0 || projectIds.includes(projectId);
}

export function suitePrimaryProjectId(suite: SuiteProjectSource) {
  return suiteProjectIds(suite)[0];
}

export function suiteProjectLabel(suite: SuiteProjectSource) {
  if (suite.projects?.length) {
    return suite.projects
      .map((project) => project.name ?? project.key ?? project.id)
      .filter(Boolean)
      .join(', ');
  }

  return suite.project?.name ?? suite.project?.key ?? suite.projectId ?? GENERAL_SUITE_PROJECT_LABEL;
}

export const testCaseStatusLabels = {
  ACTIVE: 'Ativo',
  ARCHIVED: 'Arquivado',
} as const;

export const userRoleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  QA: 'QA',
  VIEWER: 'Visualizador',
};

export const userStatusLabels: Record<UserStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

export function testRunStatusLabel(status?: TestRunStatus | null) {
  return status ? testRunStatusLabels[status] : testRunStatusLabels.PENDING;
}

export function testResultStatusLabel(status?: TestResultStatus | null) {
  return status ? testResultStatusLabels[status] : testResultStatusLabels.PENDING;
}

export function userRoleLabel(role?: UserRole | null) {
  return role ? userRoleLabels[role] : 'Usuário';
}

export function userStatusLabel(status?: UserStatus | null) {
  return userStatusLabels[status ?? 'ACTIVE'];
}

import type {
  ProjectStatus,
  TestPriority,
  TestResultStatus,
  TestRunStatus,
  TestSeverity,
  TestSuiteStatus,
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

export const testSuiteStatusLabels: Record<TestSuiteStatus, string> = {
  ACTIVE: 'Ativa',
  ARCHIVED: 'Arquivada',
};

export const GENERAL_SUITE_PROJECT_LABEL = 'Geral';

export function suiteProjectLabel(suite: {
  project?: {
    key?: string | null;
    name?: string | null;
  } | null;
  projectId?: string | null;
}) {
  return suite.project?.name ?? suite.project?.key ?? suite.projectId ?? GENERAL_SUITE_PROJECT_LABEL;
}

export const testCaseStatusLabels = {
  ACTIVE: 'Ativo',
  ARCHIVED: 'Arquivado',
  Draft: 'Rascunho',
  Ready: 'Pronto',
  'Needs review': 'Precisa de revisão',
} as const;

export const priorityLabels: Record<TestPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
};

export const severityLabels: Record<TestSeverity, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

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

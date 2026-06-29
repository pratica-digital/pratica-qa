import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  Layers3,
  ListChecks,
  PlaySquare,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { UserRole } from '../types/testRun';

export type PageId =
  | 'dashboard'
  | 'projects'
  | 'test-plans'
  | 'test-suites'
  | 'test-cases'
  | 'test-runs'
  | 'ai-test-generator'
  | 'ai-history'
  | 'ai-settings'
  | 'users'
  | 'profile';

export type NavigationItem = {
  id: PageId;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

export type Project = {
  key: string;
  name: string;
  owner: string;
  status: 'Active' | 'At risk' | 'Archived';
  suites: number;
  cases: number;
  passRate: number;
  updatedAt: string;
};

export type TestSuite = {
  name: string;
  project: string;
  status: 'Active' | 'Draft' | 'Archived';
  coverage: number;
  cases: number;
  failures: number;
  owner: string;
};

export type TestCase = {
  id: string;
  title: string;
  suite: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Draft' | 'Ready' | 'Needs review';
  steps: number;
  tags: string[];
};

export const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'projects', label: 'Equipamentos', icon: FolderOpen },
  { id: 'test-plans', label: 'Planos de Teste', icon: ClipboardList },
  { id: 'test-suites', label: 'Suítes de Teste', icon: Layers3 },
  { id: 'test-cases', label: 'Casos de Teste', icon: ListChecks },
  { id: 'test-runs', label: 'Execuções', icon: PlaySquare },
  { id: 'ai-test-generator', label: 'AI Test Generator', icon: Bot, roles: ['ADMIN', 'QA'] },
  { id: 'users', label: 'Usuários', icon: UsersRound, roles: ['ADMIN'] },
  { id: 'profile', label: 'Perfil', icon: UserRound },
];

export const projects: Project[] = [
  {
    key: 'WEB',
    name: 'App Web do Cliente',
    owner: 'Marina Lima',
    status: 'Active',
    suites: 12,
    cases: 248,
    passRate: 92,
    updatedAt: 'Hoje',
  },
  {
    key: 'API',
    name: 'API Pública',
    owner: 'Rafael Costa',
    status: 'At risk',
    suites: 8,
    cases: 164,
    passRate: 78,
    updatedAt: 'Ontem',
  },
  {
    key: 'MOB',
    name: 'Checkout Mobile',
    owner: 'Aline Santos',
    status: 'Active',
    suites: 6,
    cases: 119,
    passRate: 88,
    updatedAt: '24 de mai.',
  },
];

export const testSuites: TestSuite[] = [
  {
    name: 'Autenticação',
    project: 'App Web do Cliente',
    status: 'Active',
    coverage: 96,
    cases: 42,
    failures: 2,
    owner: 'Marina Lima',
  },
  {
    name: 'Checkout',
    project: 'Checkout Mobile',
    status: 'Active',
    coverage: 84,
    cases: 56,
    failures: 7,
    owner: 'Aline Santos',
  },
  {
    name: 'Limites de uso',
    project: 'API Pública',
    status: 'Draft',
    coverage: 61,
    cases: 28,
    failures: 3,
    owner: 'Rafael Costa',
  },
  {
    name: 'Relatórios',
    project: 'App Web do Cliente',
    status: 'Active',
    coverage: 73,
    cases: 34,
    failures: 4,
    owner: 'Marina Lima',
  },
];

export const testCases: TestCase[] = [
  {
    id: 'TC-1042',
    title: 'Usuário entra com e-mail e senha válidos',
    suite: 'Autenticação',
    priority: 'High',
    status: 'Ready',
    steps: 5,
    tags: ['smoke', 'login'],
  },
  {
    id: 'TC-1087',
    title: 'Link de redefinição de senha expira no prazo configurado',
    suite: 'Autenticação',
    priority: 'Medium',
    status: 'Needs review',
    steps: 6,
    tags: ['security'],
  },
  {
    id: 'TC-1210',
    title: 'Checkout mantém o carrinho após falha no pagamento',
    suite: 'Checkout',
    priority: 'High',
    status: 'Ready',
    steps: 8,
    tags: ['payments', 'regression'],
  },
  {
    id: 'TC-1294',
    title: 'API responde com cabeçalhos de limite de cota',
    suite: 'Limites de uso',
    priority: 'Low',
    status: 'Draft',
    steps: 4,
    tags: ['api'],
  },
];

export const activityItems = [
  'Execução de checkout concluída com 7 falhas',
  'Suíte de autenticação recebeu 5 novos casos',
  'Projeto API Pública entrou em revisão de risco',
  'Smoke mobile aprovou 38 de 42 casos',
];

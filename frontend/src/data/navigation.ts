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

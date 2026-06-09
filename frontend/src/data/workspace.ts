import type { LucideIcon } from 'lucide-react';
import {
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
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'test-plans', label: 'Test Plans', icon: ClipboardList },
  { id: 'test-suites', label: 'Test Suites', icon: Layers3 },
  { id: 'test-cases', label: 'Test Cases', icon: ListChecks },
  { id: 'test-runs', label: 'Test Runs', icon: PlaySquare },
  { id: 'users', label: 'Users', icon: UsersRound, roles: ['ADMIN'] },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export const projects: Project[] = [
  {
    key: 'WEB',
    name: 'Customer Web App',
    owner: 'Marina Lima',
    status: 'Active',
    suites: 12,
    cases: 248,
    passRate: 92,
    updatedAt: 'Today',
  },
  {
    key: 'API',
    name: 'Public API',
    owner: 'Rafael Costa',
    status: 'At risk',
    suites: 8,
    cases: 164,
    passRate: 78,
    updatedAt: 'Yesterday',
  },
  {
    key: 'MOB',
    name: 'Mobile Checkout',
    owner: 'Aline Santos',
    status: 'Active',
    suites: 6,
    cases: 119,
    passRate: 88,
    updatedAt: 'May 24',
  },
];

export const testSuites: TestSuite[] = [
  {
    name: 'Authentication',
    project: 'Customer Web App',
    status: 'Active',
    coverage: 96,
    cases: 42,
    failures: 2,
    owner: 'Marina Lima',
  },
  {
    name: 'Checkout',
    project: 'Mobile Checkout',
    status: 'Active',
    coverage: 84,
    cases: 56,
    failures: 7,
    owner: 'Aline Santos',
  },
  {
    name: 'Rate limits',
    project: 'Public API',
    status: 'Draft',
    coverage: 61,
    cases: 28,
    failures: 3,
    owner: 'Rafael Costa',
  },
  {
    name: 'Reporting',
    project: 'Customer Web App',
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
    title: 'User signs in with a valid email and password',
    suite: 'Authentication',
    priority: 'High',
    status: 'Ready',
    steps: 5,
    tags: ['smoke', 'login'],
  },
  {
    id: 'TC-1087',
    title: 'Password reset link expires after configured window',
    suite: 'Authentication',
    priority: 'Medium',
    status: 'Needs review',
    steps: 6,
    tags: ['security'],
  },
  {
    id: 'TC-1210',
    title: 'Checkout keeps cart state after payment failure',
    suite: 'Checkout',
    priority: 'High',
    status: 'Ready',
    steps: 8,
    tags: ['payments', 'regression'],
  },
  {
    id: 'TC-1294',
    title: 'API responds with headers for quota limit',
    suite: 'Rate limits',
    priority: 'Low',
    status: 'Draft',
    steps: 4,
    tags: ['api'],
  },
];

export const activityItems = [
  'Checkout run completed with 7 failures',
  'Authentication suite gained 5 new cases',
  'Public API project moved into risk review',
  'Mobile smoke run passed 38 of 42 cases',
];

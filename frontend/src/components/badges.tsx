import type { ReactNode } from 'react';
import type { TestCase, TestSuite, Project } from '../data/workspace';
import type {
  ProjectSummary,
  TestCaseStatus,
  TestPriority,
  TestResultStatus,
  TestRunStatus,
  TestSuiteStatus,
  UserRole,
  UserStatus,
} from '../types/testRun';

type BadgeProps = {
  children: ReactNode;
  tone: 'green' | 'amber' | 'red' | 'blue' | 'zinc';
};

const toneClasses: Record<BadgeProps['tone'], string> = {
  green:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  amber:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  red: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
  blue: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300',
  zinc: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
};

function Badge({ children, tone }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: Project['status'] | ProjectSummary['status'] }) {
  const tone = status === 'Active' || status === 'ACTIVE' ? 'green' : status === 'At risk' ? 'amber' : 'zinc';
  return <Badge tone={tone}>{status}</Badge>;
}

export function SuiteStatusBadge({ status }: { status: TestSuite['status'] | TestSuiteStatus }) {
  const tone = status === 'Active' || status === 'ACTIVE' ? 'green' : status === 'Draft' ? 'blue' : 'zinc';
  return <Badge tone={tone}>{status}</Badge>;
}

export function CaseStatusBadge({ status }: { status: TestCase['status'] | TestCaseStatus }) {
  const tone = status === 'Ready' || status === 'ACTIVE' ? 'green' : status === 'Needs review' ? 'amber' : 'zinc';
  return <Badge tone={tone}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TestCase['priority'] | TestPriority }) {
  const tone = priority === 'High' || priority === 'HIGH' ? 'red' : priority === 'Medium' || priority === 'MEDIUM' ? 'amber' : 'zinc';
  return <Badge tone={tone}>{priority}</Badge>;
}

export function TestRunStatusBadge({ status }: { status: TestRunStatus }) {
  const tone = status === 'COMPLETED' ? 'green' : status === 'IN_PROGRESS' ? 'blue' : 'zinc';
  return <Badge tone={tone}>{status.replace('_', ' ')}</Badge>;
}

export function TestResultStatusBadge({ status }: { status: TestResultStatus }) {
  const tone =
    status === 'PASSED'
      ? 'green'
      : status === 'FAILED'
        ? 'red'
        : status === 'SKIPPED'
          ? 'amber'
          : 'zinc';

  return <Badge tone={tone}>{status}</Badge>;
}

export function UserRoleBadge({ role }: { role: UserRole }) {
  const tone = role === 'ADMIN' ? 'blue' : role === 'QA' ? 'green' : 'zinc';
  return <Badge tone={tone}>{role}</Badge>;
}

export function UserStatusBadge({ status }: { status?: UserStatus }) {
  const tone = status === 'INACTIVE' ? 'zinc' : 'green';
  return <Badge tone={tone}>{status ?? 'ACTIVE'}</Badge>;
}

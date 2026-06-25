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
  tone: 'green' | 'amber' | 'red' | 'blue' | 'slate';
};

const toneClasses: Record<BadgeProps['tone'], string> = {
  green:
    'border-emerald-200 bg-emerald-100 text-emerald-800',
  amber:
    'border-amber-200 bg-amber-100 text-amber-800',
  red: 'border-red-200 bg-red-100 text-red-800',
  blue: 'border-blue-200 bg-blue-100 text-blue-800',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
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
  const tone = status === 'Active' || status === 'ACTIVE' ? 'green' : status === 'At risk' ? 'amber' : 'slate';
  return <Badge tone={tone}>{status}</Badge>;
}

export function SuiteStatusBadge({ status }: { status: TestSuite['status'] | TestSuiteStatus }) {
  const tone = status === 'Active' || status === 'ACTIVE' ? 'green' : status === 'Draft' ? 'blue' : 'slate';
  return <Badge tone={tone}>{status}</Badge>;
}

export function CaseStatusBadge({ status }: { status: TestCase['status'] | TestCaseStatus }) {
  const tone = status === 'Ready' || status === 'ACTIVE' ? 'green' : status === 'Needs review' ? 'amber' : 'slate';
  return <Badge tone={tone}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TestCase['priority'] | TestPriority }) {
  const tone = priority === 'High' || priority === 'HIGH' ? 'red' : priority === 'Medium' || priority === 'MEDIUM' ? 'amber' : 'slate';
  return <Badge tone={tone}>{priority}</Badge>;
}

export function TestRunStatusBadge({ status }: { status: TestRunStatus }) {
  const tone = status === 'COMPLETED' ? 'green' : status === 'IN_PROGRESS' ? 'blue' : 'slate';
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
          : 'slate';

  return <Badge tone={tone}>{status === 'PENDING' ? 'Not Run' : status}</Badge>;
}

export function UserRoleBadge({ role }: { role: UserRole }) {
  const tone = role === 'ADMIN' ? 'blue' : role === 'QA' ? 'green' : 'slate';
  return <Badge tone={tone}>{role}</Badge>;
}

export function UserStatusBadge({ status }: { status?: UserStatus }) {
  const tone = status === 'INACTIVE' ? 'slate' : 'green';
  return <Badge tone={tone}>{status ?? 'ACTIVE'}</Badge>;
}

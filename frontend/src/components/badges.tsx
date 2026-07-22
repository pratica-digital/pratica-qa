import type { ReactNode } from 'react';
import type {
  ProjectSummary,
  TestCaseStatus,
  TestResultStatus,
  UserRole,
  UserStatus,
  TestRunTestType,
} from '../types/testRun';
import { testRunTypeLabel } from '../lib/testRunTypes';
import {
  projectStatusLabels,
  testCaseStatusLabels,
  testResultStatusLabel,
  userRoleLabel,
  userStatusLabel,
} from '../lib/labels';

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

export function ProjectStatusBadge({ status }: { status: ProjectSummary['status'] }) {
  const tone = status === 'ACTIVE' ? 'green' : 'slate';
  const label = status ? projectStatusLabels[status] : 'Ativo';
  return <Badge tone={tone}>{label}</Badge>;
}

export function CaseStatusBadge({ status }: { status: TestCaseStatus }) {
  const tone = status === 'ACTIVE' ? 'green' : 'slate';
  return <Badge tone={tone}>{testCaseStatusLabels[status]}</Badge>;
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

  return <Badge tone={tone}>{testResultStatusLabel(status)}</Badge>;
}

export function UserRoleBadge({ role }: { role: UserRole }) {
  const tone = role === 'ADMIN' ? 'blue' : role === 'QA' ? 'green' : 'slate';
  return <Badge tone={tone}>{userRoleLabel(role)}</Badge>;
}

export function UserStatusBadge({ status }: { status?: UserStatus }) {
  const tone = status === 'INACTIVE' ? 'slate' : 'green';
  return <Badge tone={tone}>{userStatusLabel(status)}</Badge>;
}

export function TestRunTypeBadge({ type }: { type: TestRunTestType }) {
  return <Badge tone="blue">{testRunTypeLabel(type)}</Badge>;
}

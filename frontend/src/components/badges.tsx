import type { ReactNode } from 'react';
import type { TestCase, TestSuite, Project } from '../data/workspace';

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

export function ProjectStatusBadge({ status }: { status: Project['status'] }) {
  const tone = status === 'Active' ? 'green' : status === 'At risk' ? 'amber' : 'zinc';
  return <Badge tone={tone}>{status}</Badge>;
}

export function SuiteStatusBadge({ status }: { status: TestSuite['status'] }) {
  const tone = status === 'Active' ? 'green' : status === 'Draft' ? 'blue' : 'zinc';
  return <Badge tone={tone}>{status}</Badge>;
}

export function CaseStatusBadge({ status }: { status: TestCase['status'] }) {
  const tone = status === 'Ready' ? 'green' : status === 'Needs review' ? 'amber' : 'zinc';
  return <Badge tone={tone}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TestCase['priority'] }) {
  const tone = priority === 'High' ? 'red' : priority === 'Medium' ? 'amber' : 'zinc';
  return <Badge tone={tone}>{priority}</Badge>;
}

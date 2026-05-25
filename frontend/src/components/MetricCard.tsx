import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

type MetricCardProps = {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  tone: 'emerald' | 'sky' | 'amber' | 'rose';
};

const toneClasses: Record<MetricCardProps['tone'], string> = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

export function MetricCard({ label, value, delta, icon: Icon, tone }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          {delta}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
          {value}
        </p>
      </div>
    </article>
  );
}

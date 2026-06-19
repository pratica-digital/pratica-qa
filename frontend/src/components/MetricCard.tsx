import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

type MetricCardProps = {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  tone: 'emerald' | 'blue' | 'amber' | 'red';
};

const toneClasses: Record<MetricCardProps['tone'], string> = {
  emerald: 'bg-emerald-100 text-emerald-800',
  blue: 'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
};

export function MetricCard({ label, value, delta, icon: Icon, tone }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          {delta}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
          {value}
        </p>
      </div>
    </article>
  );
}

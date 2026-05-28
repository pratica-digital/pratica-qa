import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type ExpandableCardProps = {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  onPrimaryClick?: () => void;
};

export function ExpandableCard({
  title,
  subtitle,
  meta,
  icon,
  badge,
  actions,
  children,
  isExpanded,
  onToggle,
  onPrimaryClick,
}: ExpandableCardProps) {
  return (
    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <button
          className="min-w-0 cursor-pointer text-left outline-none"
          onClick={onPrimaryClick ?? onToggle}
          type="button"
        >
          <span className="flex min-w-0 items-start gap-3">
            {icon ? <span className="shrink-0">{icon}</span> : null}
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                  {title}
                </span>
                {badge}
              </span>
              {subtitle ? (
                <span className="mt-1 block line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {subtitle}
                </span>
              ) : null}
              {meta ? <span className="mt-3 block">{meta}</span> : null}
            </span>
          </span>
        </button>

        <div className="flex items-center justify-end gap-2">
          {actions}
          <button
            aria-expanded={isExpanded}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
            onClick={onToggle}
            title={isExpanded ? 'Collapse preview' : 'Expand preview'}
            type="button"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div
        className={`grid transition-all duration-200 ease-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">{children}</div>
        </div>
      </div>
    </article>
  );
}

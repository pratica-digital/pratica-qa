import { Bell, LogOut, Menu, Moon, Plus, Search, Sun, UserRound } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { UserRoleBadge } from './badges';
import type { PageId } from '../data/workspace';

const pageTitles: Record<PageId, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  'test-plans': 'Test Plans',
  'test-suites': 'Test Suites',
  'test-cases': 'Test Cases',
  'test-runs': 'Test Runs',
};

type TopNavProps = {
  activePage: PageId;
  createActionLabel?: string;
  isDark: boolean;
  onCreateAction?: () => void;
  onOpenSidebar: () => void;
  onToggleTheme: () => void;
};

export function TopNav({
  activePage,
  createActionLabel,
  isDark,
  onCreateAction,
  onOpenSidebar,
  onToggleTheme,
}: TopNavProps) {
  const { logout, user } = useAuth();
  const isReadOnly = user?.role === 'VIEWER';
  const adminCreatePages: PageId[] = ['projects', 'test-plans', 'test-suites', 'test-runs'];
  const requiresAdminCreate = adminCreatePages.includes(activePage);
  const isCreateDisabled =
    isReadOnly || !onCreateAction || (requiresAdminCreate && user?.role !== 'ADMIN');

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white lg:hidden"
          onClick={onOpenSidebar}
          title="Open sidebar"
          type="button"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
            {pageTitles[activePage]}
          </p>
          <p className="hidden truncate text-xs text-zinc-500 dark:text-zinc-400 sm:block">
            QA operations
          </p>
        </div>

        <label className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 md:flex">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
            placeholder="Search"
            type="search"
          />
        </label>

        {createActionLabel ? (
          <button
            className="hidden h-9 items-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 sm:flex"
            disabled={isCreateDisabled}
            onClick={onCreateAction}
            title={
              requiresAdminCreate && user?.role !== 'ADMIN'
                ? 'Only admins can create this item'
                : isReadOnly
                  ? 'Viewer mode is read-only'
                  : `New ${createActionLabel.toLowerCase()}`
            }
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {createActionLabel}
          </button>
        ) : null}

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
          title="Notifications"
          type="button"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
          onClick={onToggleTheme}
          title="Toggle dark mode"
          type="button"
        >
          {isDark ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <div className="hidden min-w-0 items-center gap-2 border-l border-zinc-200 pl-3 dark:border-zinc-800 md:flex">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="max-w-36 truncate text-sm font-medium text-zinc-950 dark:text-white">
              {user?.name}
            </p>
            {user?.role ? <UserRoleBadge role={user.role} /> : null}
          </div>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
          onClick={logout}
          title="Log out"
          type="button"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

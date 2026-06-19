import { Bell, LogOut, Menu, Moon, Plus, Search, Sun, UserRound } from 'lucide-react';
import { canManageTests } from '../auth/permissions';
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
  users: 'Users',
  profile: 'Profile',
};

type TopNavProps = {
  activePage: PageId;
  createActionLabel?: string;
  isDark: boolean;
  showPageTitle?: boolean;
  onCreateAction?: () => void;
  onOpenSidebar: () => void;
  onToggleTheme: () => void;
};

export function TopNav({
  activePage,
  createActionLabel,
  isDark,
  showPageTitle = true,
  onCreateAction,
  onOpenSidebar,
  onToggleTheme,
}: TopNavProps) {
  const { logout, user } = useAuth();
  const isReadOnly = user?.role === 'VIEWER';
  const canCreateTestItems = canManageTests(user);
  const adminCreatePages: PageId[] = ['projects', 'test-plans', 'test-suites', 'test-runs'];
  const requiresAdminCreate = adminCreatePages.includes(activePage);
  const isCreateDisabled =
    isReadOnly || !onCreateAction || (requiresAdminCreate && !canCreateTestItems);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 lg:hidden"
          onClick={onOpenSidebar}
          title="Open sidebar"
          type="button"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          {showPageTitle ? (
            <p className="truncate text-sm font-semibold text-slate-950">
              {pageTitles[activePage]}
            </p>
          ) : null}
        </div>

        <label className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 md:flex">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Search"
            type="search"
          />
        </label>

        {createActionLabel ? (
          <button
            className="hidden h-9 items-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
            disabled={isCreateDisabled}
            onClick={onCreateAction}
            title={
              requiresAdminCreate && !canCreateTestItems
                ? 'Requires test management permission'
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
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          title="Notifications"
          type="button"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950"
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

        <div className="hidden min-w-0 items-center gap-2 border-l border-slate-200 pl-3 md:flex">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="max-w-36 truncate text-sm font-medium text-slate-950">
              {user?.name}
            </p>
            {user?.role ? <UserRoleBadge role={user.role} /> : null}
          </div>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950"
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

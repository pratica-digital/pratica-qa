import { ChevronLeft, ChevronRight, UserRound, X } from 'lucide-react';
import praticaLogo from '../assets/logo-branca.png';
import simquality2 from '../assets/quality-green-l.png';
import { useAuth } from '../auth/useAuth';
import type { PageId } from '../data/workspace';
import { navigationItems } from '../data/workspace';
import { useSidebar } from './useSidebar';

type SidebarProps = {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
};

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { assignedTestRuns, user } = useAuth();
  const { closeMobileSidebar, isCollapsed, isMobileOpen, toggleSidebar } = useSidebar();
  const activeAssignedRuns = assignedTestRuns.filter((run) => run.status !== 'COMPLETED');
  const visibleNavigationItems = navigationItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));
  const progress =
    assignedTestRuns.length === 0
      ? 0
      : Math.round(((assignedTestRuns.length - activeAssignedRuns.length) / assignedTestRuns.length) * 100);
  const toggleLabel = isCollapsed ? 'Mostrar menu' : 'Ocultar menu';

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-zinc-950/35 transition-opacity lg:hidden ${
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeMobileSidebar}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col border-r border-blue-900 bg-blue-950 transition-[transform,width] duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isCollapsed ? 'lg:w-20' : 'lg:w-72'
        }`}
      >
        <div className={`flex h-16 items-center justify-between border-b border-blue-900 px-4 ${
          isCollapsed ? 'lg:px-3' : ''
        }`}>
          <button
            aria-label="Ir para dashboard"
            className={`flex min-w-0 items-center gap-3 text-left transition ${
              isCollapsed ? 'lg:justify-center' : ''
            }`}
            onClick={() => onNavigate('dashboard')}
            type="button"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-900/60">
              <img
                src={simquality2}
                alt=""
                className="h-6 w-6 object-contain"
              />
            </span>

            <span className={`min-w-0 overflow-hidden transition-all duration-200 ${
              isCollapsed ? 'lg:w-0 lg:opacity-0' : 'lg:w-40 lg:opacity-100'
            }`}>
              <img
                src={praticaLogo}
                alt="qa-platform logo"
                className="h-6 w-auto max-w-[8rem] object-contain"
              />
            </span>
          </button>

          <button
            aria-label={toggleLabel}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-blue-200 transition hover:bg-blue-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 lg:flex"
            onClick={toggleSidebar}
            title={toggleLabel}
            type="button"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-blue-200 hover:bg-blue-900 hover:text-white lg:hidden"
            onClick={closeMobileSidebar}
            title="Fechar menu"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className={`flex-1 space-y-1 px-3 py-4 ${
          isCollapsed ? 'lg:px-2' : ''
        }`}>
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors ${
                  isCollapsed ? 'lg:justify-center lg:px-0' : ''
                } ${
                  isActive
                    ? 'bg-blue-800 text-white'
                    : 'text-blue-200 hover:bg-blue-900 hover:text-white'
                }`}
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  closeMobileSidebar();
                }}
                title={item.label}
                type="button"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={`truncate transition-all duration-200 ${
                  isCollapsed ? 'lg:w-0 lg:opacity-0' : 'lg:w-auto lg:opacity-100'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className={`border-t border-blue-900 p-4 ${
          isCollapsed ? 'lg:p-3' : ''
        }`}>
          <div
            className={`rounded-lg border border-blue-900 p-3 ${
              isCollapsed ? 'lg:flex lg:h-11 lg:items-center lg:justify-center lg:p-0' : ''
            }`}
            title={user?.name}
          >
            <div className="flex items-center justify-between gap-3">
              <UserRound className={`hidden h-4 w-4 text-blue-200 ${
                isCollapsed ? 'lg:block' : ''
              }`} aria-hidden="true" />
              <div className={isCollapsed ? 'lg:hidden' : ''}>
                <p className="text-xs font-medium uppercase text-blue-200">
                  Conectado
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {user?.name}
                </p>
                <p className="mt-0.5 text-xs text-blue-200">
                  {activeAssignedRuns.length} atribuição{activeAssignedRuns.length === 1 ? '' : 'ões'} ativa{activeAssignedRuns.length === 1 ? '' : 's'}
                </p>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full bg-emerald-500 ${
                isCollapsed ? 'lg:hidden' : ''
              }`} />
            </div>
            <div className={`mt-3 h-2 rounded-full bg-blue-900/10 ${
              isCollapsed ? 'lg:hidden' : ''
            }`}>
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

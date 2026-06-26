import { X } from 'lucide-react';
import praticaLogo from '../assets/logo-branca.png';
import simquality1 from '../assets/quality.png';
import simquality2 from '../assets/quality-green-l.png';
import qalogo from '../assets/qa-logo.png';
import simquality3 from '../assets/high-quality.png';
import { useAuth } from '../auth/useAuth';
import type { PageId } from '../data/workspace';
import { navigationItems } from '../data/workspace';
import { ShieldCheck } from 'lucide-react';

type SidebarProps = {
  activePage: PageId;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
};

export function Sidebar({ activePage, isOpen, onClose, onNavigate }: SidebarProps) {
  const { assignedTestRuns, user } = useAuth();
  const activeAssignedRuns = assignedTestRuns.filter((run) => run.status !== 'COMPLETED');
  const visibleNavigationItems = navigationItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));
  const progress =
    assignedTestRuns.length === 0
      ? 0
      : Math.round(((assignedTestRuns.length - activeAssignedRuns.length) / assignedTestRuns.length) * 100);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-zinc-950/35 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col border-r border-blue-900 bg-blue-950 transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
          <div className="flex h-16 items-center justify-between border-b border-blue-900 px-4">
          <button
            className="flex min-w-0 items-center gap-3 text-left"
            onClick={() => onNavigate('dashboard')}
            type="button"
          >
            
          <span className="min-w-0">
              <img
              src={simquality2}
              alt="simquality logo"
              className="h-6 w-35 rounded-lg object-cover"
            />
            </span>  

            <img
              src={praticaLogo}
              alt="qa-platform logo"
              className="h-6 w-35 -ml-1 object-contain"
            />
          </button>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 lg:hidden"
            onClick={onClose}
            title="Close sidebar"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-800 text-white'
                    : 'text-blue-200 hover:bg-blue-900 hover:text-white'
                }`}
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                type="button"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-blue-900 p-4">
          <div className="rounded-lg border border-blue-900 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-blue-200">
                  Signed in
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {user?.name}
                </p>
                <p className="mt-0.5 text-xs text-blue-200">
                  {activeAssignedRuns.length} active assigned
                </p>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-3 h-2 rounded-full bg-blue-900/10">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

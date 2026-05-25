import { useEffect, useMemo, useState } from 'react';
import type { PageId } from '../data/workspace';
import { DashboardPage } from '../pages/DashboardPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TestCasesPage } from '../pages/TestCasesPage';
import { TestSuitesPage } from '../pages/TestSuitesPage';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const stored = window.localStorage.getItem('qa-platform-theme');

  if (stored) {
    return stored === 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export function AppShell() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('qa-platform-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const page = useMemo(() => {
    switch (activePage) {
      case 'projects':
        return <ProjectsPage />;
      case 'test-suites':
        return <TestSuitesPage />;
      case 'test-cases':
        return <TestCasesPage />;
      default:
        return <DashboardPage onNavigate={setActivePage} />;
    }
  }, [activePage]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <Sidebar
        activePage={activePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={setActivePage}
      />
      <div className="lg:pl-72">
        <TopNav
          activePage={activePage}
          isDark={isDark}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onToggleTheme={() => setIsDark((value) => !value)}
        />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{page}</main>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PageId } from '../data/workspace';
import { DashboardPage } from '../pages/DashboardPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TestCasesPage } from '../pages/TestCasesPage';
import { TestRunExecutionPage } from '../pages/TestRunExecutionPage';
import { TestRunsPage } from '../pages/TestRunsPage';
import { TestSuitesPage } from '../pages/TestSuitesPage';
import { TestPlansPage } from '../pages/TestPlansPage';
import type { TestRun } from '../types/testRun';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

const createActionLabels: Partial<Record<PageId, string>> = {
  projects: 'Project',
  'test-plans': 'Test plan',
  'test-suites': 'Suite',
  'test-cases': 'Test case',
  'test-runs': 'Test run',
};

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
  const [selectedTestRun, setSelectedTestRun] = useState<TestRun | null>(null);
  const [createActionEventId, setCreateActionEventId] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('qa-platform-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleNavigate = useCallback((pageId: PageId) => {
    setActivePage(pageId);
    setSelectedTestRun(null);
  }, []);

  const page = useMemo(() => {
    if (selectedTestRun) {
      return (
        <TestRunExecutionPage
          key={selectedTestRun.id}
          onBack={() => setSelectedTestRun(null)}
          onRunUpdated={setSelectedTestRun}
          testRun={selectedTestRun}
        />
      );
    }

    switch (activePage) {
      case 'projects':
        return <ProjectsPage createActionEventId={createActionEventId} />;
      case 'test-suites':
        return <TestSuitesPage createActionEventId={createActionEventId} />;
      case 'test-plans':
        return <TestPlansPage />;
      case 'test-cases':
        return <TestCasesPage createActionEventId={createActionEventId} />;
      case 'test-runs':
        return (
          <TestRunsPage
            createActionEventId={createActionEventId}
            onOpenRun={setSelectedTestRun}
          />
        );
      default:
        return <DashboardPage onNavigate={handleNavigate} onOpenRun={setSelectedTestRun} />;
    }
  }, [activePage, createActionEventId, handleNavigate, selectedTestRun]);

  const createActionLabel = selectedTestRun ? undefined : createActionLabels[activePage];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <Sidebar
        activePage={activePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={handleNavigate}
      />
      <div className="lg:pl-72">
        <TopNav
          activePage={activePage}
          createActionLabel={createActionLabel}
          isDark={isDark}
          onCreateAction={
            createActionLabel
              ? () => setCreateActionEventId((current) => current + 1)
              : undefined
          }
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onToggleTheme={() => setIsDark((value) => !value)}
        />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{page}</main>
      </div>
    </div>
  );
}

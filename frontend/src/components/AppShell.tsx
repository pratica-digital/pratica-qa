import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import type { PageId } from '../data/workspace';
import { DashboardPage } from '../pages/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TestCasesPage } from '../pages/TestCasesPage';
import { TestRunExecutionPage } from '../pages/TestRunExecutionPage';
import { TestRunsPage } from '../pages/TestRunsPage';
import { TestSuitesPage } from '../pages/TestSuitesPage';
import { TestPlansPage } from '../pages/TestPlansPage';
import { UsersPage } from '../pages/UsersPage';
import type { TestRun } from '../types/testRun';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { TestRunReportPage } from '../pages/TestRunReportPage';

const createActionLabels: Partial<Record<PageId, string>> = {};

const hideTopNavPageTitle: PageId[] = ['projects', 'test-plans', 'test-suites', 'test-cases', 'test-runs'];

export function AppShell() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [selectedTestRun, setSelectedTestRun] = useState<TestRun | null>(null);
  const [reportRunId, setReportRunId] = useState<string | null>(null);
  const [createActionEventId, setCreateActionEventId] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const canAccessPage = useCallback(
    (pageId: PageId) => pageId !== 'users' || user?.role === 'ADMIN',
    [user?.role],
  );

  const effectiveActivePage = canAccessPage(activePage) ? activePage : 'dashboard';

  const handleNavigate = useCallback(
    (pageId: PageId) => {
      setActivePage(canAccessPage(pageId) ? pageId : 'dashboard');
      setSelectedTestRun(null);
      setReportRunId(null);
    },
    [canAccessPage],
  );

  const handleOpenRun = useCallback((testRun: TestRun) => {
    if (testRun.status === 'COMPLETED') {
      setReportRunId(testRun.id);
      setSelectedTestRun(null);
    } else {
      setSelectedTestRun(testRun);
      setReportRunId(null);
    }
  }, []);

  const page = useMemo(() => {
  if (reportRunId) {
      return (
        <TestRunReportPage
          testRunId={reportRunId}
          onBack={() => setReportRunId(null)}
        />
      );
    }

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

    switch (effectiveActivePage) {
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
            onOpenRun={handleOpenRun}
          />
        );
      case 'users':
        return <UsersPage />;
      case 'profile':
        return <ProfilePage />;
      
      default:
      return <DashboardPage onNavigate={handleNavigate} onOpenRun={handleOpenRun} />; // ← era setSelectedTestRun
  }
 }, [createActionEventId, effectiveActivePage, handleNavigate, handleOpenRun, reportRunId, selectedTestRun]);

  const createActionLabel = selectedTestRun ? undefined : createActionLabels[effectiveActivePage];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar
        activePage={effectiveActivePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={handleNavigate}
      />
      <div className="lg:pl-72">
        <TopNav
          activePage={effectiveActivePage}
          createActionLabel={createActionLabel}
          showPageTitle={!hideTopNavPageTitle.includes(effectiveActivePage)}
          onCreateAction={
            createActionLabel
              ? () => setCreateActionEventId((current) => current + 1)
              : undefined
          }
          onNavigate={handleNavigate}
          onOpenRun={handleOpenRun}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{page}</main>
      </div>
    </div>
  );
}

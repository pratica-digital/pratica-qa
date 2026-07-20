import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import type { PageId } from '../data/navigation';
import { AiTestGeneratorModulePage } from '../pages/AiTestGeneratorModulePage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TestCasesPage } from '../pages/TestCasesPage';
import { TestRunExecutionPage } from '../pages/TestRunExecutionPage';
import { TestRunReportPage } from '../pages/TestRunReportPage';
import { TestRunsPage } from '../pages/TestRunsPage';
import { TestSuitesPage } from '../pages/TestSuitesPage';
import { TestPlansPage } from '../pages/TestPlansPage';
import { UsersPage } from '../pages/UsersPage';
import type { TestRun } from '../types/testRun';
import { Sidebar } from './Sidebar';
import { SidebarProvider } from './SidebarContext';
import { TopNav } from './TopNav';
import { useSidebar } from './useSidebar';

const createActionLabels: Partial<Record<PageId, string>> = {};

const hideTopNavPageTitle: PageId[] = ['projects', 'test-plans', 'test-suites', 'test-cases', 'test-runs'];
const aiPages: PageId[] = ['ai-test-generator', 'ai-history', 'ai-settings'];

export function AppShell() {
  return (
    <SidebarProvider>
      <AppShellContent />
    </SidebarProvider>
  );
}

function AppShellContent() {
  const { user } = useAuth();
  const { collapseSidebar, isCollapsed } = useSidebar();
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [selectedTestRun, setSelectedTestRun] = useState<TestRun | null>(null);
  const [reportRunId, setReportRunId] = useState<string | null>(null);
  const [createActionEventId, setCreateActionEventId] = useState(0);
  const previousRunStateRef = useRef<{ id: string | null; status: TestRun['status'] | null }>({
    id: null,
    status: null,
  });

  const canAccessPage = useCallback(
    (pageId: PageId) => {
      if (pageId === 'users') {
        return user?.role === 'ADMIN';
      }

      if (aiPages.includes(pageId)) {
        return user?.role === 'ADMIN' || user?.role === 'QA';
      }

      return true;
    },
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

  const handleEditCompletedRun = useCallback((testRun: TestRun) => {
    setSelectedTestRun(testRun);
    setReportRunId(null);
  }, []);

  const handleOpenReport = useCallback((testRunId: string) => {
    setReportRunId(testRunId);
    setSelectedTestRun(null);
  }, []);

  useEffect(() => {
    const previousRunState = previousRunStateRef.current;
    const currentRunId = selectedTestRun?.id ?? null;
    const currentRunStatus = selectedTestRun?.status ?? null;

    if (
      currentRunId &&
      currentRunStatus === 'IN_PROGRESS' &&
      (previousRunState.id !== currentRunId || previousRunState.status !== 'IN_PROGRESS')
    ) {
      collapseSidebar();
    }

    previousRunStateRef.current = {
      id: currentRunId,
      status: currentRunStatus,
    };
  }, [collapseSidebar, selectedTestRun?.id, selectedTestRun?.status]);

  const page = useMemo(() => {
  if (reportRunId) {
      return (
        <TestRunReportPage
          testRunId={reportRunId}
          onBack={() => setReportRunId(null)}
          onEditResults={handleEditCompletedRun}
        />
      );
    }

    if (selectedTestRun) {
      return (
        <TestRunExecutionPage
          key={selectedTestRun.id}
          onBack={() => setSelectedTestRun(null)}
          onOpenReport={handleOpenReport}
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
      case 'ai-test-generator':
        return <AiTestGeneratorModulePage key="ai-test-generator" initialTab="generate" />;
      case 'ai-history':
        return <AiTestGeneratorModulePage key="ai-history" initialTab="history" />;
      case 'ai-settings':
        return <AiTestGeneratorModulePage key="ai-settings" initialTab="settings" />;
      case 'users':
        return <UsersPage />;
      case 'profile':
        return <ProfilePage />;
      
      default:
      return <DashboardPage onNavigate={handleNavigate} onOpenRun={handleOpenRun} />; // ← era setSelectedTestRun
  }
 }, [createActionEventId, effectiveActivePage, handleEditCompletedRun, handleNavigate, handleOpenReport, handleOpenRun, reportRunId, selectedTestRun]);

  const createActionLabel = selectedTestRun ? undefined : createActionLabels[effectiveActivePage];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar
        activePage={effectiveActivePage}
        onNavigate={handleNavigate}
      />
      <div
        className={`transition-[padding] duration-200 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
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
        />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{page}</main>
      </div>
    </div>
  );
}

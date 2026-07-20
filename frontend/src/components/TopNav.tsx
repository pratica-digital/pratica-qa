import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Layers3,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  PlaySquare,
  Plus,
  Search,
  Tag,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canManageTests } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import type { PageId } from '../data/navigation';
import {
  projectsApi,
  testCasesApi,
  testPlansApi,
  testRunsApi,
  testSuitesApi,
  usersApi,
} from '../lib/api';
import { pageLabels, suiteProjectLabel, testRunStatusLabel, userRoleLabel } from '../lib/labels';
import type {
  AuthUser,
  ManagedTestCase,
  ManagedTestSuite,
  ProjectCategory,
  ProjectSummary,
  TestPlan,
  TestRun,
} from '../types/testRun';
import { PROJECT_CATEGORY_MAP, PROJECT_CATEGORY_ORDER } from '../types/testRun';
import { useSidebar } from './useSidebar';

const pageTitles: Record<PageId, string> = {
  dashboard: pageLabels.dashboard,
  projects: pageLabels.projects,
  'test-plans': pageLabels['test-plans'],
  'test-suites': pageLabels['test-suites'],
  'test-cases': pageLabels['test-cases'],
  'test-runs': pageLabels['test-runs'],
  'ai-test-generator': 'AI Test Generator',
  'ai-history': 'AI Test Generator',
  'ai-settings': 'AI Test Generator',
  users: pageLabels.users,
  profile: pageLabels.profile,
};

type TopNavProps = {
  activePage: PageId;
  createActionLabel?: string;
  showPageTitle?: boolean;
  onCreateAction?: () => void;
  onNavigate: (page: PageId) => void;
  onOpenRun: (testRun: TestRun) => void;
};

type GlobalSearchGroup =
  | 'projects'
  | 'plans'
  | 'suites'
  | 'cases'
  | 'runs'
  | 'reports'
  | 'users'
  | 'tags'
  | 'categories';

type GlobalSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  group: GlobalSearchGroup;
  page?: PageId;
  testRun?: TestRun;
};

type NotificationType = 'assigned-run' | 'completed-run' | 'critical-failure';

type TopNavNotification = {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  createdAt?: string | null;
  testRun?: TestRun;
};

type SearchState = {
  error: string;
  isLoading: boolean;
  query: string;
  results: GlobalSearchResult[];
};

type ReadNotificationState = {
  ids: Set<string>;
  storageKey: string;
};

const searchGroups: Record<GlobalSearchGroup, { icon: LucideIcon; label: string }> = {
  projects: { icon: FolderOpen, label: 'Projetos' },
  plans: { icon: ClipboardList, label: 'Planos de Teste' },
  suites: { icon: Layers3, label: 'Suítes de Teste' },
  cases: { icon: ListChecks, label: 'Casos de Teste' },
  runs: { icon: PlaySquare, label: 'Execuções' },
  reports: { icon: FileText, label: 'Relatórios' },
  users: { icon: UsersRound, label: 'Usuários' },
  tags: { icon: Tag, label: 'Tags' },
  categories: { icon: FolderOpen, label: 'Categorias' },
};

const notificationIcons: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  'assigned-run': { icon: PlaySquare, tone: 'bg-blue-100 text-blue-800' },
  'completed-run': { icon: CheckCheck, tone: 'bg-emerald-100 text-emerald-800' },
  'critical-failure': { icon: AlertTriangle, tone: 'bg-red-100 text-red-800' },
};

function getReadNotificationStorageKey(userId?: string) {
  return `qa-platform-read-notifications:${userId ?? 'anonymous'}`;
}

function loadReadNotificationIds(userId?: string) {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const stored = window.localStorage.getItem(getReadNotificationStorageKey(userId));
    const parsed = stored ? (JSON.parse(stored) as string[]) : [];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
}

function writeNotificationIds(userId: string | undefined, ids: Set<string>) {
  window.localStorage.setItem(getReadNotificationStorageKey(userId), JSON.stringify([...ids]));
}

function formatRelativeDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function includesQuery(values: Array<string | undefined | null>, query: string) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) {
    return false;
  }

  return values.some((value) => normalizeSearch(value ?? '').includes(normalizedQuery));
}

function getProjectSubtitle(project: ProjectSummary) {
  const category = project.category ? PROJECT_CATEGORY_MAP[project.category] : 'Sem categoria';
  const key = project.key ? `${project.key} - ` : '';
  return `${key}${category}`;
}

function getPlanSubtitle(plan: TestPlan) {
  const project = plan.project?.name ? `${plan.project.name} - ` : '';
  return `${project}Versão ${plan.version}`;
}

function getSuiteSubtitle(suite: ManagedTestSuite) {
  return suiteProjectLabel(suite);
}

function getCaseSubtitle(testCase: ManagedTestCase) {
  const suite = testCase.suite?.name ?? 'Suíte não atribuída';
  const tags = testCase.tags.length > 0 ? ` - ${testCase.tags.join(', ')}` : '';
  return `${suite}${tags}`;
}

function getRunSubtitle(testRun: TestRun) {
  const project = testRun.project?.name ? `${testRun.project.name} - ` : '';
  return `${project}${testRunStatusLabel(testRun.status)}`;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function buildTagResults(testCases: ManagedTestCase[], query: string): GlobalSearchResult[] {
  const tags = new Map<string, number>();

  testCases.forEach((testCase) => {
    testCase.tags.forEach((tag) => {
      if (includesQuery([tag], query)) {
        tags.set(tag, (tags.get(tag) ?? 0) + 1);
      }
    });
  });

  return [...tags.entries()].slice(0, 5).map(([tag, count]) => ({
    id: `tag:${tag}`,
    title: tag,
    subtitle: `${count} caso${count === 1 ? '' : 's'} de teste encontrado${count === 1 ? '' : 's'}`,
    group: 'tags',
    page: 'test-cases',
  }));
}

function buildCategoryResults(projects: ProjectSummary[], query: string): GlobalSearchResult[] {
  return PROJECT_CATEGORY_ORDER.filter((category) =>
    includesQuery([PROJECT_CATEGORY_MAP[category], category], query),
  ).map((category: ProjectCategory) => {
    const count = projects.filter((project) => project.category === category).length;

    return {
      id: `category:${category}`,
      title: PROJECT_CATEGORY_MAP[category],
      subtitle: `${count} projeto${count === 1 ? '' : 's'} nesta categoria`,
      group: 'categories',
      page: 'projects',
    };
  });
}

function createNotifications(testRuns: TestRun[], user?: AuthUser | null): TopNavNotification[] {
  const assignedRuns = testRuns
    .filter((run) => run.assignedToId === user?.id && run.status !== 'COMPLETED')
    .slice(0, 5)
    .map((run) => ({
      id: `assigned-run:${run.id}`,
      title: 'Execução atribuída a você',
      description: run.name,
      type: 'assigned-run' as const,
      createdAt: run.updatedAt ?? run.createdAt,
      testRun: run,
    }));

  const completedRuns = testRuns
    .filter((run) => run.status === 'COMPLETED')
    .slice(0, 4)
    .map((run) => ({
      id: `completed-run:${run.id}`,
      title: 'Execução concluída',
      description: run.name,
      type: 'completed-run' as const,
      createdAt: run.completedAt ?? run.updatedAt ?? run.createdAt,
      testRun: run,
    }));

  const failedRuns = testRuns
    .map((run) => ({
      run,
      failures: (run.results ?? []).filter((result) => result.status === 'FAILED').length,
    }))
    .filter((item) => item.failures > 0)
    .slice(0, 4)
    .map(({ failures, run }) => ({
      id: `critical-failure:${run.id}`,
      title: failures === 1 ? 'Falha registrada' : `${failures} falhas registradas`,
      description: run.name,
      type: 'critical-failure' as const,
      createdAt: run.updatedAt ?? run.completedAt ?? run.createdAt,
      testRun: run,
    }));

  return [...failedRuns, ...assignedRuns, ...completedRuns]
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 8);
}

function SearchResultRow({
  onSelect,
  result,
}: {
  onSelect: (result: GlobalSearchResult) => void;
  result: GlobalSearchResult;
}) {
  const group = searchGroups[result.group];
  const Icon = group.icon;

  return (
    <button
      className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
      onClick={() => onSelect(result)}
      type="button"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-950">{result.title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{result.subtitle}</span>
      </span>
    </button>
  );
}

function NotificationRow({
  isUnread,
  notification,
  onMarkRead,
  onOpen,
}: {
  isUnread: boolean;
  notification: TopNavNotification;
  onMarkRead: (notificationId: string) => void;
  onOpen: (notification: TopNavNotification) => void;
}) {
  const iconConfig = notificationIcons[notification.type];
  const Icon = iconConfig.icon;

  return (
    <div
      className={`rounded-lg border px-3 py-3 transition ${
        isUnread ? 'border-blue-200 bg-blue-50/80' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconConfig.tone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(notification)}
          type="button"
        >
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-950">{notification.title}</span>
            {isUnread ? <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" /> : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-600">{notification.description}</span>
          {notification.createdAt ? (
            <span className="mt-1 block text-xs text-slate-400">{formatRelativeDate(notification.createdAt)}</span>
          ) : null}
        </button>
        {isUnread ? (
          <button
            className="rounded-md px-2 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
            onClick={() => onMarkRead(notification.id)}
            type="button"
          >
            Lida
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TopNav({
  activePage,
  createActionLabel,
  showPageTitle = true,
  onCreateAction,
  onNavigate,
  onOpenRun,
}: TopNavProps) {
  const { logout, token, user } = useAuth();
  const { openMobileSidebar } = useSidebar();
  const isReadOnly = user?.role === 'VIEWER';
  const canCreateTestItems = canManageTests(user);
  const adminCreatePages: PageId[] = ['projects', 'test-plans', 'test-suites', 'test-runs'];
  const requiresAdminCreate = adminCreatePages.includes(activePage);
  const isCreateDisabled =
    isReadOnly || !onCreateAction || (requiresAdminCreate && !canCreateTestItems);

  const [searchValue, setSearchValue] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({
    error: '',
    isLoading: false,
    query: '',
    results: [],
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<TopNavNotification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const notificationStorageKey = getReadNotificationStorageKey(user?.id);
  const [readNotificationState, setReadNotificationState] = useState<ReadNotificationState>(() => ({
    ids: loadReadNotificationIds(user?.id),
    storageKey: notificationStorageKey,
  }));
  const searchRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedSearchValue = searchValue.trim();
  const canSearch = Boolean(token && normalizedSearchValue.length >= 2);
  const currentSearchResults = useMemo(
    () => (canSearch && searchState.query === normalizedSearchValue ? searchState.results : []),
    [canSearch, normalizedSearchValue, searchState.query, searchState.results],
  );
  const currentSearchError =
    canSearch && searchState.query === normalizedSearchValue ? searchState.error : '';
  const isCurrentSearchLoading =
    canSearch && (searchState.query !== normalizedSearchValue || searchState.isLoading);
  const readNotificationIds =
    readNotificationState.storageKey === notificationStorageKey
      ? readNotificationState.ids
      : loadReadNotificationIds(user?.id);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchOpen(false);
      }

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!token || normalizedSearchValue.length < 2) {
      return;
    }

    let isActive = true;
    const query = normalizedSearchValue;

    const timeoutId = window.setTimeout(async () => {
      setSearchState((current) => ({
        ...current,
        error: '',
        isLoading: true,
        query,
      }));

      try {
        const [
          projectsPage,
          plansPage,
          suitesPage,
          casesPage,
          runsPage,
          users,
        ] = await Promise.all([
          projectsApi.listPage(token, { search: query, limit: 5 }),
          testPlansApi.listPage(token, { search: query, limit: 5 }),
          testSuitesApi.listPage(token, { search: query, limit: 5 }),
          testCasesApi.listPage(token, { search: query, limit: 20 }),
          testRunsApi.listPage(token, { search: query, limit: 10 }),
          user?.role === 'ADMIN' ? usersApi.list(token) : Promise.resolve([] as AuthUser[]),
        ]);

        if (!isActive) {
          return;
        }

        const projectResults: GlobalSearchResult[] = projectsPage.data.map((project) => ({
          id: `project:${project.id}`,
          title: project.name,
          subtitle: getProjectSubtitle(project),
          group: 'projects',
          page: 'projects',
        }));
        const planResults: GlobalSearchResult[] = plansPage.data.map((plan) => ({
          id: `plan:${plan.id}`,
          title: plan.name,
          subtitle: getPlanSubtitle(plan),
          group: 'plans',
          page: 'test-plans',
        }));
        const suiteResults: GlobalSearchResult[] = suitesPage.data.map((suite) => ({
          id: `suite:${suite.id}`,
          title: suite.name,
          subtitle: getSuiteSubtitle(suite),
          group: 'suites',
          page: 'test-suites',
        }));
        const caseResults: GlobalSearchResult[] = casesPage.data.slice(0, 5).map((testCase) => ({
          id: `case:${testCase.id}`,
          title: testCase.title,
          subtitle: getCaseSubtitle(testCase),
          group: 'cases',
          page: 'test-cases',
        }));
        const runResults: GlobalSearchResult[] = runsPage.data
          .filter((testRun) => testRun.status !== 'COMPLETED')
          .slice(0, 5)
          .map((testRun) => ({
            id: `run:${testRun.id}`,
            title: testRun.name,
            subtitle: getRunSubtitle(testRun),
            group: 'runs',
            testRun,
          }));
        const reportResults: GlobalSearchResult[] = runsPage.data
          .filter((testRun) => testRun.status === 'COMPLETED')
          .slice(0, 5)
          .map((testRun) => ({
            id: `report:${testRun.id}`,
            title: testRun.name,
            subtitle: `Relatório final - ${getRunSubtitle(testRun)}`,
            group: 'reports',
            testRun,
          }));
        const userResults: GlobalSearchResult[] = users
          .filter((item) => includesQuery([item.name, item.email, item.role], query))
          .slice(0, 5)
          .map((item) => ({
            id: `user:${item.id}`,
            title: item.name,
            subtitle: `${item.email} - ${userRoleLabel(item.role)}`,
            group: 'users',
            page: 'users',
          }));

        setSearchState({
          error: '',
          isLoading: false,
          query,
          results: uniqueById([
            ...projectResults,
            ...planResults,
            ...suiteResults,
            ...caseResults,
            ...runResults,
            ...reportResults,
            ...userResults,
            ...buildTagResults(casesPage.data, query),
            ...buildCategoryResults(projectsPage.data, query),
          ]),
        });
      } catch (error) {
        if (isActive) {
          setSearchState({
            error: error instanceof Error ? error.message : 'Não foi possível buscar.',
            isLoading: false,
            query,
            results: [],
          });
        }
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedSearchValue, token, user?.role]);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoadingNotifications(true);

    try {
      const page = await testRunsApi.listPage(token, { limit: 40 });
      setNotifications(createNotifications(page.data, user));
    } catch {
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [token, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchNotifications]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !readNotificationIds.has(notification.id)),
    [notifications, readNotificationIds],
  );

  const groupedSearchResults = useMemo(
    () =>
      currentSearchResults.reduce(
        (groups, result) => {
          groups[result.group] = [...(groups[result.group] ?? []), result];
          return groups;
        },
        {} as Partial<Record<GlobalSearchGroup, GlobalSearchResult[]>>,
      ),
    [currentSearchResults],
  );

  function markNotificationRead(notificationId: string) {
    setReadNotificationState((current) => {
      const currentIds =
        current.storageKey === notificationStorageKey ? current.ids : loadReadNotificationIds(user?.id);
      const next = new Set(currentIds);
      next.add(notificationId);
      writeNotificationIds(user?.id, next);

      return {
        ids: next,
        storageKey: notificationStorageKey,
      };
    });
  }

  function markAllNotificationsRead() {
    setReadNotificationState((current) => {
      const currentIds =
        current.storageKey === notificationStorageKey ? current.ids : loadReadNotificationIds(user?.id);
      const next = new Set(currentIds);
      notifications.forEach((notification) => next.add(notification.id));
      writeNotificationIds(user?.id, next);

      return {
        ids: next,
        storageKey: notificationStorageKey,
      };
    });
  }

  function openRun(testRun: TestRun) {
    setIsSearchOpen(false);
    setIsNotificationOpen(false);
    onOpenRun(testRun);
  }

  function handleSelectSearchResult(result: GlobalSearchResult) {
    setIsSearchOpen(false);
    setSearchValue('');

    if (result.testRun) {
      openRun(result.testRun);
      return;
    }

    if (result.page) {
      onNavigate(result.page);
    }
  }

  function handleOpenNotification(notification: TopNavNotification) {
    markNotificationRead(notification.id);

    if (notification.testRun) {
      openRun(notification.testRun);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 lg:hidden"
          onClick={openMobileSidebar}
          title="Abrir menu"
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

        <div className="relative hidden w-full max-w-md md:block" ref={searchRef}>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              onChange={(event) => {
                setSearchValue(event.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Buscar projetos, execuções, usuários..."
              ref={searchInputRef}
              type="search"
              value={searchValue}
            />
          </label>

          {isSearchOpen ? (
            <div className="absolute right-0 top-11 z-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">
              {normalizedSearchValue.length < 2 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  Digite pelo menos 2 caracteres para buscar na plataforma.
                </div>
              ) : isCurrentSearchLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Buscando
                </div>
              ) : currentSearchError ? (
                <div className="px-4 py-6 text-center text-sm text-red-600">{currentSearchError}</div>
              ) : currentSearchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  Nenhum resultado encontrado para "{normalizedSearchValue}".
                </div>
              ) : (
                <div className="max-h-[28rem] overflow-y-auto p-2">
                  {(Object.keys(searchGroups) as GlobalSearchGroup[]).map((groupKey) => {
                    const results = groupedSearchResults[groupKey];

                    if (!results?.length) {
                      return null;
                    }

                    return (
                      <section className="py-1" key={groupKey}>
                        <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {searchGroups[groupKey].label}
                        </p>
                        <div className="space-y-1">
                          {results.map((result) => (
                            <SearchResultRow
                              key={result.id}
                              onSelect={handleSelectSearchResult}
                              result={result}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {createActionLabel ? (
          <button
            className="hidden h-9 items-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
            disabled={isCreateDisabled}
            onClick={onCreateAction}
            title={
              requiresAdminCreate && !canCreateTestItems
                ? 'Requer permissão de gestão de testes'
                : isReadOnly
                  ? 'Modo visualizador é somente leitura'
                  : `Novo item: ${createActionLabel.toLowerCase()}`
            }
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {createActionLabel}
          </button>
        ) : null}

        <div className="relative" ref={notificationRef}>
          <button
            aria-label={`${unreadNotifications.length} notificações não lidas`}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            onClick={() => setIsNotificationOpen((current) => !current)}
            title="Notificações"
            type="button"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadNotifications.length > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] font-semibold text-white">
                {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
              </span>
            ) : null}
          </button>

          {isNotificationOpen ? (
            <div className="absolute right-0 top-11 z-40 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Notificações</p>
                  <p className="text-xs text-slate-500">
                    {unreadNotifications.length} não lida{unreadNotifications.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                    onClick={() => void fetchNotifications()}
                    type="button"
                  >
                    Atualizar
                  </button>
                  {notifications.length > 0 ? (
                    <button
                      className="rounded-md px-2 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                      onClick={markAllNotificationsRead}
                      type="button"
                    >
                      Marcar todas como lidas
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto p-3">
                {isLoadingNotifications ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Carregando notificações
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                    <p className="mt-3 text-sm font-medium text-slate-700">Nenhuma notificação</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Atribuições, execuções concluídas e falhas aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <NotificationRow
                        isUnread={!readNotificationIds.has(notification.id)}
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markNotificationRead}
                        onOpen={handleOpenNotification}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <button
          className="hidden min-w-0 items-center gap-2 border-l border-slate-200 pl-3 md:flex"
          onClick={() => onNavigate('profile')}
          title="Abrir perfil"
          type="button"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block max-w-36 truncate text-sm font-medium text-slate-950">
              {user?.name}
            </span>
            <span className="block truncate text-xs text-slate-500">{userRoleLabel(user?.role)}</span>
          </span>
        </button>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          onClick={logout}
          title="Sair"
          type="button"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

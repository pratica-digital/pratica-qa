import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { SidebarContext } from './SidebarContextCore';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'qa-platform-sidebar-collapsed';

function readStoredCollapsedState() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(readStoredCollapsedState);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isCollapsed));
    } catch {
      // Keep the in-memory preference even if storage is unavailable.
    }
  }, [isCollapsed]);

  const collapseSidebar = useCallback(() => setIsCollapsed(true), []);
  const expandSidebar = useCallback(() => setIsCollapsed(false), []);
  const toggleSidebar = useCallback(() => setIsCollapsed((current) => !current), []);
  const openMobileSidebar = useCallback(() => setIsMobileOpen(true), []);
  const closeMobileSidebar = useCallback(() => setIsMobileOpen(false), []);

  const value = useMemo(
    () => ({
      closeMobileSidebar,
      collapseSidebar,
      expandSidebar,
      isCollapsed,
      isMobileOpen,
      openMobileSidebar,
      toggleSidebar,
    }),
    [
      closeMobileSidebar,
      collapseSidebar,
      expandSidebar,
      isCollapsed,
      isMobileOpen,
      openMobileSidebar,
      toggleSidebar,
    ],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

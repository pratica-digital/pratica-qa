import { createContext } from 'react';

export type SidebarContextValue = {
  closeMobileSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  openMobileSidebar: () => void;
  toggleSidebar: () => void;
};

export const SidebarContext = createContext<SidebarContextValue | null>(null);

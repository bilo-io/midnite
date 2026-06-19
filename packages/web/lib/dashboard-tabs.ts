'use client';

import { useCallback } from 'react';
import { useLocalStorage } from './use-local-storage';
import { DASHBOARD_WIDGETS_STORAGE_KEY, DEFAULT_WIDGETS } from './dashboard-widgets';

/** One dashboard tab: a stable id and a user-editable name. */
export type DashboardTab = { id: string; name: string };

/** Hard ceiling on tabs (the first is always present, so the range is 1–5). */
export const MAX_DASHBOARDS = 5;

/**
 * The first tab's id. Its widgets/layout reuse the original pre-tabs storage
 * keys, so an existing single-board setup keeps working with zero migration.
 */
const DEFAULT_TAB_ID = 'default';

export const DEFAULT_TABS: DashboardTab[] = [{ id: DEFAULT_TAB_ID, name: 'Dashboard' }];

const TABS_KEY = 'midnite.dashboard.tabs';
const ACTIVE_KEY = 'midnite.dashboard.active';
/** Legacy react-grid-layout key (pre-tabs) — kept verbatim for the first tab. */
const LEGACY_LAYOUT_KEY = 'midnite-dashboard-layout-v3';
const MAX_NAME_LEN = 40;

/** localStorage key for a tab's widget list. */
export function widgetsKey(id: string): string {
  return id === DEFAULT_TAB_ID
    ? DASHBOARD_WIDGETS_STORAGE_KEY
    : `${DASHBOARD_WIDGETS_STORAGE_KEY}:${id}`;
}

/** localStorage key for a tab's react-grid-layout positions. */
export function layoutKey(id: string): string {
  return id === DEFAULT_TAB_ID ? LEGACY_LAYOUT_KEY : `midnite-dashboard-layout:${id}`;
}

export type UseDashboardTabs = {
  tabs: DashboardTab[];
  activeId: string;
  hydrated: boolean;
  setActiveId: (id: string) => void;
  addTab: () => void;
  closeTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
};

/**
 * Multiple dashboards as tabs, backed by localStorage and kept in sync across
 * components (grid, tab strip, add-widget) via the `useLocalStorage` broadcast —
 * the same context-free pattern the board already used for its single widget list.
 */
export function useDashboardTabs(): UseDashboardTabs {
  const [tabs, setTabs, tabsHydrated] = useLocalStorage<DashboardTab[]>(TABS_KEY, DEFAULT_TABS);
  const [activeId, setActiveId, activeHydrated] = useLocalStorage<string>(ACTIVE_KEY, DEFAULT_TAB_ID);

  // Tolerate a stored active id that points at a since-removed tab.
  const safeActiveId = tabs.some((t) => t.id === activeId) ? activeId : (tabs[0]?.id ?? DEFAULT_TAB_ID);

  const addTab = useCallback(() => {
    if (tabs.length >= MAX_DASHBOARDS) return;
    const id = crypto.randomUUID();
    // Seed the board so it opens with the default widget set (the grid reads this
    // key once it becomes active). Direct write — no hook is mounted on it yet.
    try {
      localStorage.setItem(widgetsKey(id), JSON.stringify(DEFAULT_WIDGETS));
    } catch {
      // ignore write failures (private mode / quota)
    }
    setTabs([...tabs, { id, name: `Dashboard ${tabs.length + 1}` }]);
    setActiveId(id);
  }, [tabs, setTabs, setActiveId]);

  const closeTab = useCallback(
    (id: string) => {
      if (tabs.length <= 1 || tabs[0]?.id === id) return; // first tab is non-closable
      const next = tabs.filter((t) => t.id !== id);
      try {
        localStorage.removeItem(widgetsKey(id));
        localStorage.removeItem(layoutKey(id));
      } catch {
        // ignore
      }
      setTabs(next);
      if (activeId === id) setActiveId(next[0]?.id ?? DEFAULT_TAB_ID);
    },
    [tabs, activeId, setTabs, setActiveId],
  );

  const renameTab = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim().slice(0, MAX_NAME_LEN);
      if (!trimmed) return;
      setTabs(tabs.map((t) => (t.id === id ? { ...t, name: trimmed } : t)));
    },
    [tabs, setTabs],
  );

  return {
    tabs,
    activeId: safeActiveId,
    hydrated: tabsHydrated && activeHydrated,
    setActiveId,
    addTab,
    closeTab,
    renameTab,
  };
}

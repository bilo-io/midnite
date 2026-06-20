'use client';

import { useCallback } from 'react';
import { useLocalStorage } from './use-local-storage';
import { DASHBOARD_WIDGETS_STORAGE_KEY, NEW_TAB_LAYOUT, NEW_TAB_WIDGETS } from './dashboard-widgets';

/**
 * One dashboard tab: a stable id, a user-editable name, and a pin flag. Pinned
 * tabs sort into their own zone between the default tab and the unpinned tabs.
 */
export type DashboardTab = { id: string; name: string; pinned?: boolean };

/** Hard ceiling on tabs (the first is always present, so the range is 1–10). */
export const MAX_DASHBOARDS = 10;

/**
 * The first tab's id. Its widgets/layout reuse the original pre-tabs storage
 * keys, so an existing single-board setup keeps working with zero migration. It's
 * a permanent anchor: always first, never pinnable/draggable/closable.
 */
const DEFAULT_TAB_ID = 'default';

export const DEFAULT_TABS: DashboardTab[] = [{ id: DEFAULT_TAB_ID, name: 'Dashboard' }];

const TABS_KEY = 'midnite.dashboard.tabs';
const ACTIVE_KEY = 'midnite.dashboard.active';
/** Legacy react-grid-layout key (pre-tabs) — kept verbatim for the first tab. */
const LEGACY_LAYOUT_KEY = 'midnite-dashboard-layout-v3';
const MAX_NAME_LEN = 40;

/** The default tab is the permanent first anchor and is never pinnable/closable. */
export function isDefaultTab(id: string): boolean {
  return id === DEFAULT_TAB_ID;
}

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

/**
 * Enforce the canonical order `[default, ...pinned, ...unpinned]`, each group
 * keeping its existing relative order (stable partition).
 */
function canonicalize(tabs: DashboardTab[]): DashboardTab[] {
  const def = tabs.filter((t) => t.id === DEFAULT_TAB_ID);
  const rest = tabs.filter((t) => t.id !== DEFAULT_TAB_ID);
  return [...def, ...rest.filter((t) => t.pinned), ...rest.filter((t) => !t.pinned)];
}

export type UseDashboardTabs = {
  tabs: DashboardTab[];
  activeId: string;
  hydrated: boolean;
  setActiveId: (id: string) => void;
  addTab: () => void;
  closeTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  togglePin: (id: string) => void;
  /** Persist a new order for the non-default tabs (same-zone moves only). */
  reorderTabs: (orderedNonDefaultIds: string[]) => void;
};

/**
 * Multiple dashboards as tabs, backed by localStorage and kept in sync across
 * components (grid, tab strip, add-widget) via the `useLocalStorage` broadcast —
 * the same context-free pattern the board already used for its single widget list.
 */
export function useDashboardTabs(): UseDashboardTabs {
  const [tabs, setTabs, tabsHydrated] = useLocalStorage<DashboardTab[]>(TABS_KEY, DEFAULT_TABS);
  const [activeId, setActiveId, activeHydrated] = useLocalStorage<string>(ACTIVE_KEY, DEFAULT_TAB_ID);

  // Consumers always see canonical order; mutators below also write canonical.
  const ordered = canonicalize(tabs);

  // Tolerate a stored active id that points at a since-removed tab.
  const safeActiveId = ordered.some((t) => t.id === activeId)
    ? activeId
    : (ordered[0]?.id ?? DEFAULT_TAB_ID);

  const addTab = useCallback(() => {
    if (tabs.length >= MAX_DASHBOARDS) return;
    const id = crypto.randomUUID();
    // Seed a near-empty board (just time + date, side by side in the top-left) so
    // the new tab opens ready but uncluttered. The grid reads these keys once the
    // tab becomes active; direct write — no hook is mounted on it yet.
    try {
      localStorage.setItem(widgetsKey(id), JSON.stringify(NEW_TAB_WIDGETS));
      localStorage.setItem(layoutKey(id), JSON.stringify(NEW_TAB_LAYOUT));
    } catch {
      // ignore write failures (private mode / quota)
    }
    // New tabs join unpinned at the end; canonicalize keeps the invariant.
    setTabs(canonicalize([...tabs, { id, name: `Dashboard ${tabs.length + 1}` }]));
    setActiveId(id);
  }, [tabs, setTabs, setActiveId]);

  const closeTab = useCallback(
    (id: string) => {
      const tab = tabs.find((t) => t.id === id);
      // Permanent anchor, pinned (locked), or the only tab → not closable.
      if (!tab || tab.id === DEFAULT_TAB_ID || tab.pinned || tabs.length <= 1) return;
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

  const togglePin = useCallback(
    (id: string) => {
      if (id === DEFAULT_TAB_ID) return; // the anchor is never pinnable
      // Flip the flag; canonicalize lands it at the end of the pinned zone (when
      // pinning) or the start of the unpinned zone (when unpinning).
      setTabs(canonicalize(tabs.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t))));
    },
    [tabs, setTabs],
  );

  const reorderTabs = useCallback(
    (orderedNonDefaultIds: string[]) => {
      const byId = new Map(tabs.map((t) => [t.id, t]));
      const def = tabs.filter((t) => t.id === DEFAULT_TAB_ID);
      const reordered = orderedNonDefaultIds
        .map((id) => byId.get(id))
        .filter((t): t is DashboardTab => t != null);
      // canonicalize is a no-op for valid same-zone moves; a safety net otherwise.
      setTabs(canonicalize([...def, ...reordered]));
    },
    [tabs, setTabs],
  );

  return {
    tabs: ordered,
    activeId: safeActiveId,
    hydrated: tabsHydrated && activeHydrated,
    setActiveId,
    addTab,
    closeTab,
    renameTab,
    togglePin,
    reorderTabs,
  };
}

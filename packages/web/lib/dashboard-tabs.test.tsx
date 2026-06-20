import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MAX_DASHBOARDS, layoutKey, useDashboardTabs, widgetsKey } from './dashboard-tabs';

describe('dashboard tab storage keys', () => {
  it('reuses the legacy keys for the first tab (zero migration)', () => {
    expect(widgetsKey('default')).toBe('midnite.dashboard.widgets');
    expect(layoutKey('default')).toBe('midnite-dashboard-layout-v3');
  });

  it('namespaces non-default tabs by id', () => {
    expect(widgetsKey('abc')).toBe('midnite.dashboard.widgets:abc');
    expect(layoutKey('abc')).toBe('midnite-dashboard-layout:abc');
  });
});

describe('useDashboardTabs', () => {
  beforeEach(() => localStorage.clear());

  it('starts with a single default tab', () => {
    const { result } = renderHook(() => useDashboardTabs());
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.activeId).toBe('default');
  });

  it('adds tabs up to the max and no further', () => {
    const { result } = renderHook(() => useDashboardTabs());
    for (let i = 0; i < MAX_DASHBOARDS + 1; i++) act(() => result.current.addTab());
    expect(result.current.tabs).toHaveLength(MAX_DASHBOARDS);
  });

  it('makes a new tab active and seeds it with the near-empty time+date board', () => {
    const { result } = renderHook(() => useDashboardTabs());
    act(() => result.current.addTab());
    const newId = result.current.tabs[1]!.id;
    expect(result.current.activeId).toBe(newId);
    const seeded = JSON.parse(localStorage.getItem(widgetsKey(newId))!) as { type: string }[];
    expect(seeded.map((w) => w.type)).toEqual(['clock', 'date']);
  });

  it('seeds a layout with time + date side by side in the top-left', () => {
    const { result } = renderHook(() => useDashboardTabs());
    act(() => result.current.addTab());
    const newId = result.current.tabs[1]!.id;
    const layout = JSON.parse(localStorage.getItem(layoutKey(newId))!) as {
      lg: { i: string; x: number; y: number; w: number; h: number }[];
    };
    const byId = Object.fromEntries(layout.lg.map((it) => [it.i, it]));
    // Both at the top row, clock at the left edge, date to its right (side by side).
    expect(byId.clock!.x).toBe(0);
    expect(byId.clock!.y).toBe(0);
    expect(byId.date!.y).toBe(0);
    expect(byId.date!.x).toBeGreaterThan(0);
    // Equal size.
    expect(byId.clock!.w).toBe(byId.date!.w);
    expect(byId.clock!.h).toBe(byId.date!.h);
  });

  it('refuses to close the first tab, closes others and clears their storage', () => {
    const { result } = renderHook(() => useDashboardTabs());
    act(() => result.current.addTab());
    const firstId = result.current.tabs[0]!.id;
    const newId = result.current.tabs[1]!.id;

    act(() => result.current.closeTab(firstId)); // first tab is non-closable
    expect(result.current.tabs).toHaveLength(2);

    act(() => result.current.closeTab(newId));
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.activeId).toBe('default');
    expect(localStorage.getItem(widgetsKey(newId))).toBeNull();
  });

  it('renames a tab (trimmed)', () => {
    const { result } = renderHook(() => useDashboardTabs());
    act(() => result.current.addTab());
    const newId = result.current.tabs[1]!.id;
    act(() => result.current.renameTab(newId, '  Research  '));
    expect(result.current.tabs[1]!.name).toBe('Research');
  });

  it('pinning moves a tab into the pinned zone (after default, before unpinned)', () => {
    const { result } = renderHook(() => useDashboardTabs());
    act(() => result.current.addTab()); // A
    act(() => result.current.addTab()); // B
    const [, aId, bId] = result.current.tabs.map((t) => t.id); // [default, A, B]

    act(() => result.current.togglePin(bId!));
    expect(result.current.tabs.map((t) => t.id)).toEqual(['default', bId, aId]);
    expect(result.current.tabs[1]!.pinned).toBe(true);
    expect(result.current.tabs[2]!.pinned).toBeFalsy();
  });

  it('unpinning returns a tab to the front of the unpinned zone', () => {
    const { result } = renderHook(() => useDashboardTabs());
    act(() => result.current.addTab()); // A
    act(() => result.current.addTab()); // B
    const [, aId, bId] = result.current.tabs.map((t) => t.id);

    act(() => result.current.togglePin(aId!)); // [default, A(pinned), B]
    act(() => result.current.togglePin(aId!)); // unpin → [default, A, B]
    expect(result.current.tabs.map((t) => t.id)).toEqual(['default', aId, bId]);
    expect(result.current.tabs.every((t) => !t.pinned)).toBe(true);
  });

  it('refuses to close a pinned tab until it is unpinned', () => {
    const { result } = renderHook(() => useDashboardTabs());
    act(() => result.current.addTab());
    const aId = result.current.tabs[1]!.id;

    act(() => result.current.togglePin(aId));
    act(() => result.current.closeTab(aId)); // locked → refused
    expect(result.current.tabs).toHaveLength(2);

    act(() => result.current.togglePin(aId)); // unpin
    act(() => result.current.closeTab(aId)); // now closable
    expect(result.current.tabs).toHaveLength(1);
  });

  it('reorders tabs within a zone, preserving the canonical partition', () => {
    const { result } = renderHook(() => useDashboardTabs());
    act(() => result.current.addTab()); // A
    act(() => result.current.addTab()); // B
    act(() => result.current.addTab()); // C
    const [, aId, bId, cId] = result.current.tabs.map((t) => t.id); // [default, A, B, C]

    act(() => result.current.reorderTabs([cId!, aId!, bId!])); // C to front of unpinned
    expect(result.current.tabs.map((t) => t.id)).toEqual(['default', cId, aId, bId]);
  });
});

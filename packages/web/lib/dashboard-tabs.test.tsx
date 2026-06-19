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

  it('makes a new tab active and seeds its widget storage', () => {
    const { result } = renderHook(() => useDashboardTabs());
    act(() => result.current.addTab());
    const newId = result.current.tabs[1]!.id;
    expect(result.current.activeId).toBe(newId);
    expect(localStorage.getItem(widgetsKey(newId))).not.toBeNull();
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
});

import { describe, expect, it } from 'vitest';
import {
  ALL_WIDGET_TYPES,
  DASHBOARD_WIDGETS,
  MULTI_INSTANCE,
  WIDGET_CATEGORIES,
  groupWidgetCatalog,
  newInstance,
  widgetCatalog,
  type WidgetInstance,
} from './dashboard-widgets';

describe('dashboard widget registry', () => {
  it('has metadata for every widget type', () => {
    for (const type of ALL_WIDGET_TYPES) {
      const meta = DASHBOARD_WIDGETS[type];
      expect(meta, type).toBeTruthy();
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.sizes.lg.w).toBeGreaterThan(0);
    }
  });

  it('includes the shipped widget added in Phase 7', () => {
    expect(ALL_WIDGET_TYPES).toContain('shipped');
    expect(DASHBOARD_WIDGETS.shipped.label).toBe('Shipped');
  });

  it('includes the quick-capture widget added in Phase 7 Theme C', () => {
    expect(ALL_WIDGET_TYPES).toContain('quick-capture');
    expect(DASHBOARD_WIDGETS['quick-capture'].label).toBe('Quick capture');
    expect(DASHBOARD_WIDGETS['quick-capture'].category).toBe('tasks');
  });

  it('includes the per-repo status widget added in Phase 7 Theme C', () => {
    expect(ALL_WIDGET_TYPES).toContain('repo-status');
    expect(DASHBOARD_WIDGETS['repo-status'].label).toBe('Per-repo status');
    expect(DASHBOARD_WIDGETS['repo-status'].category).toBe('agents');
  });

  it('includes the system-monitor widget', () => {
    expect(ALL_WIDGET_TYPES).toContain('system-monitor');
    expect(DASHBOARD_WIDGETS['system-monitor'].label).toBe('System monitor');
    expect(DASHBOARD_WIDGETS['system-monitor'].category).toBe('system');
  });

  it('files every widget under a known category', () => {
    const known = new Set(WIDGET_CATEGORIES.map((c) => c.key));
    for (const type of ALL_WIDGET_TYPES) {
      expect(known, type).toContain(DASHBOARD_WIDGETS[type].category);
    }
  });
});

describe('groupWidgetCatalog', () => {
  it('buckets the catalogue into category order, dropping empty sections', () => {
    const groups = groupWidgetCatalog(widgetCatalog([]), '');
    // Sections preserve WIDGET_CATEGORIES order, and every survivor is non-empty.
    const order = groups.map((g) => g.category);
    const expectedOrder = WIDGET_CATEGORIES.map((c) => c.key).filter((k) =>
      order.includes(k),
    );
    expect(order).toEqual(expectedOrder);
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
    // Nothing is dropped: grouped items sum to the full catalogue.
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(ALL_WIDGET_TYPES.length);
  });

  it('filters by label and description, case-insensitively', () => {
    const byLabel = groupWidgetCatalog(widgetCatalog([]), 'system monitor');
    const hits = byLabel.flatMap((g) => g.items.map((i) => i.type));
    expect(hits).toContain('system-monitor');

    // "memory" only appears in the system-monitor description, not its label.
    const byDescription = groupWidgetCatalog(widgetCatalog([]), 'MEMORY');
    expect(byDescription.flatMap((g) => g.items.map((i) => i.type))).toContain('system-monitor');

    expect(groupWidgetCatalog(widgetCatalog([]), 'zzz-no-such-widget')).toEqual([]);
  });

  it('catalog lists every widget, marking placed single-instance ones as added', () => {
    const finances: WidgetInstance = {
      type: 'finances',
      id: 'a',
      config: { title: 'X', income: [], expenses: [], showDetail: true },
    };
    const enabled: WidgetInstance[] = [{ type: 'shipped' }, finances];
    const catalog = widgetCatalog(enabled);
    const byType = new Map(catalog.map((c) => [c.type, c]));

    expect(catalog).toHaveLength(ALL_WIDGET_TYPES.length); // every widget shows
    expect(byType.get('shipped')?.added).toBe(true); // single-instance, placed → greyed
    expect(byType.get('news')?.added).toBe(false); // not placed → addable
    expect(byType.get('finances')?.added).toBe(false); // multi-instance never greys out
    expect(MULTI_INSTANCE.has('finances')).toBe(true);
  });

  it('newInstance returns the right shape per widget type', () => {
    expect(newInstance('links')).toEqual({ type: 'links', config: { links: [] } });
    expect(newInstance('shipped')).toEqual({ type: 'shipped' });
    const finances = newInstance('finances');
    expect(finances.type).toBe('finances');
    if (finances.type === 'finances') expect(typeof finances.id).toBe('string');
  });

  it('newInstance seeds quote settings (size, typing speed, 1-minute cycle)', () => {
    const quote = newInstance('quote');
    expect(quote.type).toBe('quote');
    if (quote.type === 'quote') {
      expect(quote.config.size).toBe('md');
      expect(quote.config.cycleMs).toBe(60_000);
      expect(quote.config.typingSpeedMs).toBeGreaterThan(0);
    }
  });
});

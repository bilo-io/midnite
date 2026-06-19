import { describe, expect, it } from 'vitest';
import {
  ALL_WIDGET_TYPES,
  DASHBOARD_WIDGETS,
  MULTI_INSTANCE,
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

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

  it('catalog hides a placed single-instance widget but keeps multi-instance ones', () => {
    const finances: WidgetInstance = {
      type: 'finances',
      id: 'a',
      config: { title: 'X', income: [], expenses: [], showDetail: true },
    };
    const enabled: WidgetInstance[] = [{ type: 'shipped' }, finances];
    const catalog = widgetCatalog(enabled).map((c) => c.type);

    expect(catalog).not.toContain('shipped'); // single-instance, already placed
    expect(catalog).toContain('finances'); // multi-instance stays available
    expect(MULTI_INSTANCE.has('finances')).toBe(true);
  });

  it('newInstance returns the right shape per widget type', () => {
    expect(newInstance('links')).toEqual({ type: 'links', config: { links: [] } });
    expect(newInstance('shipped')).toEqual({ type: 'shipped' });
    const finances = newInstance('finances');
    expect(finances.type).toBe('finances');
    if (finances.type === 'finances') expect(typeof finances.id).toBe('string');
  });
});

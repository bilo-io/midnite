import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPS_WIDGETS,
  migrateOpsWidgets,
  OPS_WIDGETS,
  opsWidgetsNeedMigration,
  type OpsWidgetInstance,
} from './ops-widgets';

describe('ops widget legacy migration (composite → per-card split)', () => {
  it('flags a board that still holds a retired composite type', () => {
    expect(opsWidgetsNeedMigration([{ type: 'cost' } as unknown as OpsWidgetInstance])).toBe(true);
    expect(opsWidgetsNeedMigration([{ type: 'cycle-fleet' } as unknown as OpsWidgetInstance])).toBe(true);
    expect(opsWidgetsNeedMigration(DEFAULT_OPS_WIDGETS)).toBe(false);
  });

  it('expands cost → cost-trend + cost-breakdown and cycle-fleet → cycle-time + fleet-trend, in place', () => {
    const legacy = [
      { type: 'gauges' },
      { type: 'cost' },
      { type: 'cycle-fleet' },
      { type: 'task-health' },
    ] as unknown as OpsWidgetInstance[];
    expect(migrateOpsWidgets(legacy).map((w) => w.type)).toEqual([
      'gauges',
      'cost-trend',
      'cost-breakdown',
      'cycle-time',
      'fleet-trend',
      'task-health',
    ]);
  });

  it('is a no-op on an already-migrated board and de-dupes successors', () => {
    expect(migrateOpsWidgets(DEFAULT_OPS_WIDGETS)).toEqual(DEFAULT_OPS_WIDGETS);
    const dupe = [{ type: 'cost' }, { type: 'cost-trend' }] as unknown as OpsWidgetInstance[];
    expect(migrateOpsWidgets(dupe).map((w) => w.type)).toEqual(['cost-trend', 'cost-breakdown']);
  });

  it('every default widget resolves to a registry entry (no dangling keys)', () => {
    for (const w of DEFAULT_OPS_WIDGETS) {
      expect(OPS_WIDGETS[w.type], w.type).toBeDefined();
    }
    // The retired composites are gone from the catalogue.
    expect('cost' in OPS_WIDGETS).toBe(false);
    expect('cycle-fleet' in OPS_WIDGETS).toBe(false);
  });
});

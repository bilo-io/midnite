import { describe, expect, it } from 'vitest';
import type { PlantVariant } from './layout';
import {
  DESK_SETUPS,
  deskSetup,
  MONITOR_SCREENS,
  monitorKey,
  plantTexture,
  TEX,
} from './textures';

describe('plantTexture (Phase 9 B2 plant species)', () => {
  it('maps each variant to its own texture key', () => {
    expect(plantTexture('leafy')).toBe(TEX.plant);
    expect(plantTexture('palm')).toBe(TEX.plantPalm);
    expect(plantTexture('succulent')).toBe(TEX.plantSucculent);
  });

  it('gives the three species three distinct textures', () => {
    const variants: PlantVariant[] = ['leafy', 'palm', 'succulent'];
    expect(new Set(variants.map(plantTexture)).size).toBe(3);
  });
});

describe('desk variety helpers (Phase 8 A3)', () => {
  it('monitorKey cycles through the screen variants', () => {
    expect(monitorKey(0)).toBe('office-monitor-0');
    expect(monitorKey(MONITOR_SCREENS.length)).toBe(monitorKey(0));
    expect(new Set(MONITOR_SCREENS.map((_, i) => monitorKey(i))).size).toBe(
      MONITOR_SCREENS.length,
    );
  });

  it('deskSetup is deterministic, cyclic, and includes all setups', () => {
    expect(deskSetup(0)).toBe(deskSetup(DESK_SETUPS.length));
    expect(new Set(DESK_SETUPS)).toEqual(new Set(['single', 'dual', 'laptop']));
  });
});

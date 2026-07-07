import { describe, expect, it } from 'vitest';

import { OFFICE_TILE } from '@/lib/office/dimensions';
import { worldToMinimap } from '@/lib/office/minimap';
import { minimapFacing, worldUnitToMinimap } from './minimap-3d';

describe('worldUnitToMinimap', () => {
  it('scales 3D world units up by OFFICE_TILE before mapping (matches 2D)', () => {
    const scale = 0.1;
    const pad = 6;
    const got = worldUnitToMinimap(5, 8, scale, pad);
    const want = worldToMinimap(5 * OFFICE_TILE, 8 * OFFICE_TILE, scale, pad);
    expect(got).toEqual(want);
  });
});

describe('minimapFacing', () => {
  it('points up (0 rad) when facing north (−z)', () => {
    expect(minimapFacing(0, -1)).toBeCloseTo(0);
  });

  it('rotates for the cardinal directions', () => {
    expect(minimapFacing(1, 0)).toBeCloseTo(-Math.PI / 2); // east
    expect(minimapFacing(-1, 0)).toBeCloseTo(Math.PI / 2); // west
    expect(Math.abs(minimapFacing(0, 1))).toBeCloseTo(Math.PI); // south
  });

  it('returns 0 for a zero-length direction', () => {
    expect(minimapFacing(0, 0)).toBe(0);
  });
});

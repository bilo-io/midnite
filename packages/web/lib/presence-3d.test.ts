import { describe, expect, it } from 'vitest';
import { OFFICE_TILE } from '@/lib/office/dimensions';
import { facingFromDir, facingYaw, presencePxToUnit, unitToPresencePx } from './presence-3d';

describe('unit <-> presence px', () => {
  it('round-trips through the tile scale', () => {
    const px = unitToPresencePx(3, 8);
    expect(px).toEqual({ x: 3 * OFFICE_TILE, y: 8 * OFFICE_TILE });
    expect(presencePxToUnit(px.x, px.y)).toEqual({ x: 3, z: 8 });
  });
});

describe('facingFromDir', () => {
  it('maps the camera forward to a 4-way wire facing', () => {
    expect(facingFromDir(1, 0)).toBe('right');
    expect(facingFromDir(-1, 0)).toBe('left');
    expect(facingFromDir(0, 1)).toBe('down'); // +z = south
    expect(facingFromDir(0, -1)).toBe('up'); // -z = north
  });

  it('picks the dominant axis', () => {
    expect(facingFromDir(0.9, 0.1)).toBe('right');
    expect(facingFromDir(0.1, -0.9)).toBe('up');
  });
});

describe('facingYaw', () => {
  it('turns a +z figure to face each direction', () => {
    expect(facingYaw('down')).toBe(0);
    expect(facingYaw('up')).toBeCloseTo(Math.PI);
    expect(facingYaw('right')).toBeCloseTo(-Math.PI / 2);
    expect(facingYaw('left')).toBeCloseTo(Math.PI / 2);
  });
});

import { describe, expect, it } from 'vitest';

import { PLAYER_SPAWN, blockedGrid } from '@/lib/office/layout';
import { PLAYER_RADIUS } from './constants';
import { circleHitsBlocked, resolveMove, resolveMoveInto, type Vec2 } from './collision';

const grid = blockedGrid();

describe('circleHitsBlocked', () => {
  it('reports open floor as clear', () => {
    // Player spawn tile centre is walkable in both offices.
    expect(circleHitsBlocked(PLAYER_SPAWN.x + 0.5, PLAYER_SPAWN.y + 0.5, PLAYER_RADIUS, grid)).toBe(false);
  });

  it('treats out-of-bounds as a wall', () => {
    expect(circleHitsBlocked(-5, -5, PLAYER_RADIUS, grid)).toBe(true);
  });

  it('collides when the circle overlaps a solid tile', () => {
    // Row 0 is the top border wall; a point just inside it overlaps.
    expect(circleHitsBlocked(6.5, 0.9, PLAYER_RADIUS, grid)).toBe(true);
  });
});

describe('resolveMove', () => {
  it('moves freely across open floor', () => {
    const from = { x: PLAYER_SPAWN.x + 0.5, z: PLAYER_SPAWN.y + 0.5 };
    const res = resolveMove(from.x, from.z, 0.2, 0, grid, PLAYER_RADIUS);
    expect(res.x).toBeCloseTo(from.x + 0.2);
    expect(res.z).toBeCloseTo(from.z);
  });

  it('slides along a wall: blocked axis cancels, free axis still applies', () => {
    // Stand just below the top wall (row 0). Pushing up (-z, into the wall) while
    // also moving +x should cancel the z step but keep the x step.
    const x = 6.5;
    const z = 1.0 + PLAYER_RADIUS + 0.01; // just clear of the wall
    const res = resolveMove(x, z, 0.15, -0.3, grid, PLAYER_RADIUS);
    expect(res.x).toBeGreaterThan(x); // slid along the wall
    expect(res.z).toBeCloseTo(z); // into-wall component cancelled
  });

  it('never lets the circle enter a solid tile', () => {
    // Hurl the player straight into the top wall; it must stay clear.
    const x = 6.5;
    const z = 1.4;
    const res = resolveMove(x, z, 0, -5, grid, PLAYER_RADIUS);
    expect(circleHitsBlocked(res.x, res.z, PLAYER_RADIUS, grid)).toBe(false);
  });

  it('passes through a 2-tile doorway', () => {
    // Row 10 is the mid divider; its doorway at cols 5–6 spans world x∈[5,7], so
    // the clear centre is x=6.0. Step south (+z) from the work room across it.
    const res = resolveMove(6.0, 9.8, 0, 0.6, grid, PLAYER_RADIUS);
    expect(res.z).toBeCloseTo(10.4); // walked through the gap, not blocked
  });

  // Theme G perf budget: the movement loop resolves into a reused scratch object.
  it('resolveMoveInto writes into the same object it returns (no allocation)', () => {
    const out: Vec2 = { x: 0, z: 0 };
    const ret = resolveMoveInto(out, 6.5, 5, 0.2, 0, grid, PLAYER_RADIUS);
    expect(ret).toBe(out); // same reference — reused, not freshly allocated
    expect(out.x).toBeCloseTo(6.7);
    // Matches the allocating resolveMove for the same inputs.
    expect(resolveMove(6.5, 5, 0.2, 0, grid, PLAYER_RADIUS)).toEqual({ x: out.x, z: out.z });
  });
});

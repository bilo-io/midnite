import { describe, expect, it } from 'vitest';

import { generateDeskLayout, MAX_DESKS } from './desks';
import { ROOMS } from './layout';

const WORK = ROOMS.find((r) => r.id === 'work')!;
const inWorkInterior = (p: { x: number; y: number }) =>
  p.x >= WORK.x && p.x < WORK.x + WORK.w && p.y >= WORK.y && p.y < WORK.y + WORK.h;

describe('generateDeskLayout', () => {
  it('produces exactly `capacity` seats for in-range capacities', () => {
    for (const n of [1, 3, 6, 10, 16]) {
      expect(generateDeskLayout(n).seats).toHaveLength(n);
    }
  });

  it('clamps capacity to [1, MAX_DESKS]', () => {
    expect(generateDeskLayout(0).seats).toHaveLength(1);
    expect(generateDeskLayout(-5).seats).toHaveLength(1);
    expect(generateDeskLayout(999).seats).toHaveLength(MAX_DESKS);
  });

  it('keeps every seat inside the WORK room interior', () => {
    for (const n of [1, 6, 16, MAX_DESKS]) {
      for (const seat of generateDeskLayout(n).seats) {
        expect(inWorkInterior(seat)).toBe(true);
      }
    }
  });

  it('gives distinct seat tiles (no two desks share a tile)', () => {
    for (const n of [6, 16, MAX_DESKS]) {
      const keys = generateDeskLayout(n).seats.map((s) => `${s.x},${s.y}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('shrinks desks as capacity grows (more desks → smaller scale)', () => {
    expect(generateDeskLayout(4).deskScale).toBeGreaterThan(generateDeskLayout(20).deskScale);
  });

  it('keeps the scale within sane bounds', () => {
    for (const n of [1, 6, 16, MAX_DESKS]) {
      const { deskScale } = generateDeskLayout(n);
      expect(deskScale).toBeGreaterThanOrEqual(0.75);
      expect(deskScale).toBeLessThanOrEqual(1.25);
    }
  });

  it('is deterministic', () => {
    expect(generateDeskLayout(10)).toEqual(generateDeskLayout(10));
  });
});

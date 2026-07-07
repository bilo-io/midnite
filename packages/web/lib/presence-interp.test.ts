import { describe, expect, it } from 'vitest';
import { interpStep, shouldSnap } from './presence-interp';

describe('interpStep', () => {
  it('eases toward the target without overshooting', () => {
    const next = interpStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 16, { rateMs: 120, snapDist: 1000 });
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(100);
  });

  it('snaps when the gap exceeds snapDist (scene change / reconnect jump)', () => {
    const next = interpStep({ x: 0, y: 0 }, { x: 500, y: 500 }, 16, { snapDist: 96 });
    expect(next).toEqual({ x: 500, y: 500 });
  });

  it('converges to the target over successive steps', () => {
    let p = { x: 0, y: 0 };
    const target = { x: 50, y: 50 };
    for (let i = 0; i < 200; i++) p = interpStep(p, target, 16, { rateMs: 120, snapDist: 1000 });
    expect(p.x).toBeCloseTo(50, 1);
    expect(p.y).toBeCloseTo(50, 1);
  });

  it('a longer frame moves proportionally further', () => {
    const near = interpStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 8, { rateMs: 120, snapDist: 1000 });
    const far = interpStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 64, { rateMs: 120, snapDist: 1000 });
    expect(far.x).toBeGreaterThan(near.x);
  });
});

describe('shouldSnap', () => {
  it('snaps on a scene change regardless of distance', () => {
    expect(shouldSnap('office', 'corner', { x: 0, y: 0 }, { x: 1, y: 1 })).toBe(true);
  });

  it('snaps on a large same-scene jump but eases a small one', () => {
    expect(shouldSnap('office', 'office', { x: 0, y: 0 }, { x: 500, y: 0 }, 96)).toBe(true);
    expect(shouldSnap('office', 'office', { x: 0, y: 0 }, { x: 10, y: 0 }, 96)).toBe(false);
  });
});

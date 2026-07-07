import { describe, expect, it } from 'vitest';

import { HEADBOB_AMPLITUDE, HEADBOB_ROLL, HEADBOB_STEP_LENGTH } from './constants';
import { advanceBobPhase, computeHeadBob } from './headbob';

describe('advanceBobPhase', () => {
  it('advances by walked distance (a full step = π)', () => {
    expect(advanceBobPhase(0, HEADBOB_STEP_LENGTH)).toBeCloseTo(Math.PI);
    expect(advanceBobPhase(0, 0)).toBe(0);
  });

  it('is monotonic in distance', () => {
    expect(advanceBobPhase(1, 0.5)).toBeGreaterThan(1);
  });
});

describe('computeHeadBob', () => {
  it('is exactly still at zero intensity (reduced motion / standing)', () => {
    for (const phase of [0, 0.5, 1.3, Math.PI, 4.2]) {
      const { dy, roll } = computeHeadBob(phase, 0);
      // Math.abs normalises the harmless -0 that sin(negative)*0 can produce.
      expect(Math.abs(dy)).toBe(0);
      expect(Math.abs(roll)).toBe(0);
    }
  });

  it('bounds the bob + roll by their amplitudes, scaled by intensity', () => {
    for (const phase of [0.3, 1.1, 2.7, 5.0]) {
      const full = computeHeadBob(phase, 1);
      expect(Math.abs(full.dy)).toBeLessThanOrEqual(HEADBOB_AMPLITUDE + 1e-9);
      expect(Math.abs(full.roll)).toBeLessThanOrEqual(HEADBOB_ROLL + 1e-9);
    }
  });

  it('scales linearly with intensity', () => {
    const half = computeHeadBob(1.2, 0.5);
    const full = computeHeadBob(1.2, 1);
    expect(half.dy).toBeCloseTo(full.dy / 2);
    expect(half.roll).toBeCloseTo(full.roll / 2);
  });

  it('rolls at half the bob frequency (one sway per two steps)', () => {
    // At phase = 2π the vertical bob returns to ~0 (full cycle) while the roll
    // (half frequency) is at its own half-cycle extreme — they are not in phase.
    const { dy } = computeHeadBob(2 * Math.PI, 1);
    expect(Math.abs(dy)).toBeLessThan(1e-9);
    const { roll } = computeHeadBob(Math.PI, 1); // roll arg = π/2 → extreme
    expect(Math.abs(roll)).toBeCloseTo(HEADBOB_ROLL);
  });

  it('clamps out-of-range intensity', () => {
    expect(computeHeadBob(1.5, 5).dy).toBeCloseTo(computeHeadBob(1.5, 1).dy);
    expect(computeHeadBob(1.5, -2).dy).toBe(0);
  });
});

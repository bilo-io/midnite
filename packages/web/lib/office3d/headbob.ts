/**
 * Phase 63 Theme B — footstep head-bob. Pure curve, `three`-free: a gentle
 * vertical bob plus a smaller lateral roll at half the frequency (one sway per
 * two steps), amplitude scaled by an `intensity` (0..1) the rig eases in on
 * move-start and out on stop. The bob **phase advances by walked distance**
 * (`advanceBobPhase`), not time, so cadence tracks speed like real footsteps.
 *
 * Reduced motion is honoured by the caller passing `intensity = 0` (the rig
 * zeroes it when `useAnimationPrefs().animate` is false) — at which point both
 * offsets are exactly 0, so the camera sits still at eye height.
 */

import { HEADBOB_AMPLITUDE, HEADBOB_ROLL, HEADBOB_STEP_LENGTH } from './constants';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Advance the bob phase by `distance` walked this frame (radians). */
export function advanceBobPhase(phase: number, distance: number): number {
  return phase + (distance / HEADBOB_STEP_LENGTH) * Math.PI;
}

/**
 * Vertical + roll camera offsets for a bob `phase` at a given `intensity` (0..1).
 * `intensity = 0` (reduced motion or standing still) returns exactly `{0, 0}`.
 */
export function computeHeadBob(phase: number, intensity: number): { dy: number; roll: number } {
  const i = clamp01(intensity);
  return {
    dy: Math.sin(phase) * HEADBOB_AMPLITUDE * i,
    roll: Math.sin(phase * 0.5) * HEADBOB_ROLL * i,
  };
}

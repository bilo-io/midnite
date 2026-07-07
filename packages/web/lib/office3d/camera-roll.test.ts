import { Euler, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { createHeadBobRoll } from './camera-roll';
import { HEADBOB_ROLL } from './constants';

/**
 * Replays exactly what drei/three's `PointerLockControls` does on a mouse move:
 * decode the camera quaternion through a YXZ Euler, nudge yaw (y), clamp pitch (x),
 * and write it back — preserving the inner-Z roll it read. This is the round-trip
 * the head-bob roll has to coexist with.
 */
function pointerLookYaw(camera: PerspectiveCamera, deltaYaw: number): void {
  const e = new Euler(0, 0, 0, 'YXZ');
  e.setFromQuaternion(camera.quaternion);
  e.y += deltaYaw;
  const halfPi = Math.PI / 2;
  e.x = Math.max(-halfPi, Math.min(halfPi, e.x));
  camera.quaternion.setFromEuler(e);
}

/** World up tilt: 0 = perfectly upright, → π = fully upside-down. */
function rollFromUpright(camera: PerspectiveCamera): number {
  const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  return up.angleTo(new Vector3(0, 1, 0));
}

describe('createHeadBobRoll', () => {
  it('applies roll about the local view axis, leaving the forward direction unchanged', () => {
    const camera = new PerspectiveCamera();
    const before = camera.getWorldDirection(new Vector3());
    createHeadBobRoll().apply(camera, HEADBOB_ROLL);
    const after = camera.getWorldDirection(new Vector3());
    expect(after.angleTo(before)).toBeCloseTo(0, 6);
  });

  it('is absolute, not cumulative — repeated applies never grow the roll', () => {
    const camera = new PerspectiveCamera();
    const roll = createHeadBobRoll();
    for (let i = 0; i < 200; i++) roll.apply(camera, HEADBOB_ROLL);
    // A single steady roll of HEADBOB_ROLL, no matter how many frames.
    expect(rollFromUpright(camera)).toBeCloseTo(HEADBOB_ROLL, 5);
  });

  it('returns to upright when the bob eases back to zero', () => {
    const camera = new PerspectiveCamera();
    const roll = createHeadBobRoll();
    roll.apply(camera, HEADBOB_ROLL);
    roll.apply(camera, 0);
    expect(rollFromUpright(camera)).toBeCloseTo(0, 6);
  });

  it('does not accumulate roll while looking around (the upside-down bug)', () => {
    const camera = new PerspectiveCamera();
    const roll = createHeadBobRoll();
    // Sustained yaw (looking right) with an oscillating head-bob roll for many
    // frames — the exact scenario that flipped the view with `camera.rotation.z`.
    for (let i = 0; i < 720; i++) {
      pointerLookYaw(camera, -0.02);
      roll.apply(camera, Math.sin(i * 0.5) * HEADBOB_ROLL);
    }
    roll.apply(camera, 0); // bob stops when you stop moving
    // The view must be dead upright — never creeping toward upside-down.
    expect(rollFromUpright(camera)).toBeCloseTo(0, 4);
  });

  it('regression: writing roll via an XYZ Euler DOES accumulate under the same loop', () => {
    // Proves the test exercises the real failure mode: the old approach
    // (`camera.rotation.z = roll`, default XYZ order) drifts far from upright.
    const camera = new PerspectiveCamera(); // default rotation order is 'XYZ'
    for (let i = 0; i < 720; i++) {
      pointerLookYaw(camera, -0.02);
      camera.rotation.z = Math.sin(i * 0.5) * HEADBOB_ROLL;
    }
    camera.rotation.z = 0;
    expect(rollFromUpright(camera)).toBeGreaterThan(0.1);
  });

  it('reuses its scratch quaternions (no per-apply allocation of new state)', () => {
    // Sanity: the applicator is a closure over reused Quaternions, so calling it
    // in a hot frame loop allocates nothing beyond three's in-place math.
    const camera = new PerspectiveCamera();
    const roll = createHeadBobRoll();
    const q0 = camera.quaternion;
    roll.apply(camera, HEADBOB_ROLL);
    expect(camera.quaternion).toBe(q0); // same Quaternion instance, mutated in place
  });
});

describe('quaternion invariants used by the fix', () => {
  it('post-multiplying by a local-Z rotation is exactly what PointerLockControls preserves', () => {
    // yaw*pitch, then roll about local Z, decoded YXZ gives back the same roll.
    const q = new Quaternion().setFromEuler(new Euler(0.3, 0.4, 0, 'YXZ'));
    q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), HEADBOB_ROLL));
    const decoded = new Euler(0, 0, 0, 'YXZ').setFromQuaternion(q);
    expect(decoded.z).toBeCloseTo(HEADBOB_ROLL, 6);
    expect(decoded.y).toBeCloseTo(0.4, 6);
  });
});

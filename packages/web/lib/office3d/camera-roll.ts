/**
 * Phase 63 — head-bob camera roll, applied with quaternions.
 *
 * The rigs let drei's `PointerLockControls` own yaw/pitch. On every mouse move it
 * round-trips the camera through a **YXZ** Euler (`_euler.setFromQuaternion` →
 * adjust y/x → `setFromEuler`), which preserves whatever roll it decodes on the
 * inner Z axis. The head-bob then wants to add a small roll on top.
 *
 * Writing that roll via `camera.rotation.z` uses the camera's default **XYZ**
 * Euler order. The two orders disagree, so each frame the roll gets re-decomposed
 * in the wrong basis and bleeds into yaw/pitch — while you look around (sustained
 * yaw) the error compounds and the view slowly rolls until it flips upside-down.
 *
 * Doing it in quaternion space avoids the mismatch entirely: a roll is a rotation
 * about the camera's **local** view axis, i.e. a post-multiply on the camera
 * quaternion — which is exactly the inner-Z rotation `PointerLockControls`
 * preserves losslessly. Each frame we undo the previous roll and apply the new
 * one, so roll is absolute (never accumulates) and never contaminates yaw/pitch.
 */

import { Quaternion, Vector3, type Camera } from 'three';

// The camera looks down its local -Z; roll is a rotation about that view axis.
const VIEW_AXIS = new Vector3(0, 0, 1);

export interface HeadBobRoll {
  /** Set the camera's roll (radians) about its local view axis, replacing any prior roll. */
  apply(camera: Camera, roll: number): void;
}

/**
 * Create a stateful head-bob roll applicator. Holds one applicator per rig (via a
 * ref/memo) so the previous roll can be removed before the next is applied — the
 * scratch quaternions are reused, so there is no per-frame allocation.
 */
export function createHeadBobRoll(): HeadBobRoll {
  const roll = new Quaternion();
  const invRoll = new Quaternion();
  let applied = 0;

  return {
    apply(camera, next) {
      // Remove the previous frame's roll first (a post-multiply about local Z,
      // which PointerLockControls preserves exactly), so roll never accumulates.
      if (applied !== 0) camera.quaternion.multiply(invRoll);
      if (next !== 0) {
        roll.setFromAxisAngle(VIEW_AXIS, next);
        invRoll.copy(roll).invert();
        camera.quaternion.multiply(roll);
      }
      applied = next;
    },
  };
}

'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';

import { blockedGrid } from '@/lib/office/layout';
import { EYE_HEIGHT, MOVE_SPEED, PLAYER_RADIUS } from '@/lib/office3d/constants';
import { resolveMove } from '@/lib/office3d/collision';
import { advanceBobPhase, computeHeadBob } from '@/lib/office3d/headbob';
import type { WorldModel } from '@/lib/office3d/world';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';

/**
 * Phase 63 Theme B — the first-person rig: drei pointer-lock mouse-look + WASD/
 * arrow movement (from Theme A), now with **grid-AABB collision** (circle vs the
 * 2D office's `blockedGrid()` — walls + furniture + pool, per-axis wall-slide)
 * and a **footstep head-bob** (vertical bob + subtle roll, scaled by walk speed,
 * eased in/out). The bob is disabled under reduced motion — `useAnimationPrefs`
 * combines the OS `prefers-reduced-motion` query with the Phase-39 motion setting.
 * Movement only runs while the pointer is locked.
 */

const UP = new Vector3(0, 1, 0);

// How fast the head-bob intensity eases toward its target (per second).
const BOB_EASE_RATE = 9;

type MoveState = { forward: boolean; back: boolean; left: boolean; right: boolean };

const KEY_MAP: Record<string, keyof MoveState> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export function FirstPersonRig({ spawn, onLockChange }: { spawn: WorldModel['spawn']; onLockChange?: (locked: boolean) => void }) {
  const controlsRef = useRef<React.ElementRef<typeof PointerLockControls>>(null);
  const move = useRef<MoveState>({ forward: false, back: false, left: false, right: false });
  const { camera } = useThree();

  // Solid tiles (walls + furniture + pool) — the same walkability data the 2D
  // office uses, so 3D collision matches 2D exactly.
  const grid = useMemo(() => blockedGrid(), []);

  // Reduced-motion gate (OS query + Phase-39 setting) — read via a ref so the
  // per-frame loop sees the latest value without re-subscribing.
  const { animate } = useAnimationPrefs();
  const animateRef = useRef(animate);
  animateRef.current = animate;

  // Reusable scratch vectors — no per-frame allocation in the movement loop.
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const delta = useRef(new Vector3());
  // Head-bob state: phase advances by walked distance; intensity eases in/out.
  const bobPhase = useRef(0);
  const bobIntensity = useRef(0);

  // Spawn at the 2D player's entry tile, at eye height.
  useEffect(() => {
    camera.position.set(spawn.x, spawn.y, spawn.z);
  }, [camera, spawn]);

  useEffect(() => {
    const setKey = (code: string, pressed: boolean) => {
      const key = KEY_MAP[code];
      if (key) move.current[key] = pressed;
    };
    const onDown = (e: KeyboardEvent) => setKey(e.code, true);
    const onUp = (e: KeyboardEvent) => setKey(e.code, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useFrame((_, dt) => {
    const controls = controlsRef.current;
    if (!controls || !controls.isLocked) return;
    const m = move.current;

    // Camera forward projected onto the floor plane; strafe axis = forward × up.
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, UP).normalize();

    delta.current.set(0, 0, 0);
    if (m.forward) delta.current.add(forward.current);
    if (m.back) delta.current.sub(forward.current);
    if (m.right) delta.current.add(right.current);
    if (m.left) delta.current.sub(right.current);

    let distance = 0;
    if (delta.current.lengthSq() > 0) {
      delta.current.normalize().multiplyScalar(MOVE_SPEED * dt);
      // Resolve against solid tiles (per-axis wall-slide) instead of moving free.
      const resolved = resolveMove(
        camera.position.x,
        camera.position.z,
        delta.current.x,
        delta.current.z,
        grid,
        PLAYER_RADIUS,
      );
      const dx = resolved.x - camera.position.x;
      const dz = resolved.z - camera.position.z;
      distance = Math.hypot(dx, dz);
      camera.position.x = resolved.x;
      camera.position.z = resolved.z;
    }

    // Ease the bob intensity toward 1 while actually moving (0 when stopped, hit
    // a wall, or reduced motion), and advance the phase by distance walked.
    const target = distance > 1e-5 && animateRef.current ? 1 : 0;
    bobIntensity.current += (target - bobIntensity.current) * Math.min(1, dt * BOB_EASE_RATE);
    bobPhase.current = advanceBobPhase(bobPhase.current, distance);
    const bob = computeHeadBob(bobPhase.current, bobIntensity.current);

    // Vertical bob rides on eye height; the subtle roll is applied to the camera
    // (PointerLockControls only writes yaw/pitch, so z stays ours).
    camera.position.y = EYE_HEIGHT + bob.dy;
    camera.rotation.z = bob.roll;
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => onLockChange?.(true)}
      onUnlock={() => onLockChange?.(false)}
    />
  );
}

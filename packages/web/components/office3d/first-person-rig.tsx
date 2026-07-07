'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';

import { EYE_HEIGHT, MOVE_SPEED } from '@/lib/office3d/constants';
import type { WorldModel } from '@/lib/office3d/world';

/**
 * Phase 63 Theme A — a minimal first-person rig: drei pointer-lock mouse-look
 * plus WASD/arrow free movement on the floor plane, so the world is walkable the
 * moment it renders. Theme B layers grid-AABB collision + footstep head-bob on
 * top; this slice deliberately has neither (you can walk through furniture for
 * now). Movement only runs while the pointer is locked.
 */

const UP = new Vector3(0, 1, 0);

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

  // Reusable scratch vectors — no per-frame allocation in the movement loop.
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const delta = useRef(new Vector3());

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

    if (delta.current.lengthSq() > 0) {
      delta.current.normalize().multiplyScalar(MOVE_SPEED * dt);
      camera.position.add(delta.current);
    }
    // Keep the walker glued to the floor (no vertical drift from look pitch).
    camera.position.y = EYE_HEIGHT;
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => onLockChange?.(true)}
      onUnlock={() => onLockChange?.(false)}
    />
  );
}

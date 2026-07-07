'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';

import { createHeadBobRoll } from '@/lib/office3d/camera-roll';
import { resolveMoveInto, type Vec2 } from '@/lib/office3d/collision';
import { EYE_HEIGHT, MOVE_SPEED, PLAYER_RADIUS } from '@/lib/office3d/constants';
import { advanceBobPhase, computeHeadBob } from '@/lib/office3d/headbob';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';

/**
 * Phase 63 Theme D/E — the shared first-person rig for the office **sub-scenes**
 * (arcade, corner office). Pointer-lock mouse-look + WASD/arrow movement with
 * grid-AABB collision (per-axis wall-slide) and a reduced-motion-aware head-bob —
 * the same pure `resolveMove` + head-bob helpers the office rig uses, against a
 * caller-supplied collision grid. Interaction is delegated: `onInteract` fires on
 * `E`/Enter or a crosshair click (only while locked + `active`), and `onProximity`
 * runs each frame so the scene can update a prompt. When `active` goes false
 * (a panel opens, or Breakout takes over) the rig unlocks + freezes.
 *
 * The office's own `FirstPersonRig` stays separate — it carries minimap-pose +
 * live-avatar-proximity wiring this generic rig doesn't need.
 */

const UP = new Vector3(0, 1, 0);
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

export function SubSceneRig({
  grid,
  spawn,
  active,
  onInteract,
  onProximity,
  onLockChange,
}: {
  grid: boolean[][];
  spawn: { x: number; y: number; z: number };
  /** While false the rig unlocks + freezes (panel open, or a mini-game is active). */
  active: boolean;
  /** Fired on E/Enter or a crosshair click while locked + active. */
  onInteract?: (px: number, pz: number, dirX: number, dirZ: number) => void;
  /** Called each frame with the player position (for contextual prompts). */
  onProximity?: (px: number, pz: number) => void;
  onLockChange?: (locked: boolean) => void;
}) {
  const controlsRef = useRef<React.ElementRef<typeof PointerLockControls>>(null);
  const move = useRef<MoveState>({ forward: false, back: false, left: false, right: false });
  const { camera } = useThree();
  const { animate } = useAnimationPrefs();
  const animateRef = useRef(animate);
  animateRef.current = animate;
  const activeRef = useRef(active);
  activeRef.current = active;

  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const delta = useRef(new Vector3());
  const aim = useRef(new Vector3());
  const moveOut = useRef<Vec2>({ x: 0, z: 0 }); // scratch — no per-frame alloc
  const bobPhase = useRef(0);
  const bobIntensity = useRef(0);
  // Applies the head-bob roll as a local-axis quaternion (see camera-roll.ts).
  const headBobRoll = useMemo(createHeadBobRoll, []);

  useEffect(() => {
    camera.position.set(spawn.x, spawn.y, spawn.z);
  }, [camera, spawn]);

  // Freeze + release the lock when the scene deactivates (panel/mini-game).
  useEffect(() => {
    if (!active) controlsRef.current?.unlock();
  }, [active]);

  useEffect(() => {
    const setKey = (code: string, pressed: boolean) => {
      const key = KEY_MAP[code];
      if (key) move.current[key] = pressed;
    };
    const interact = () => {
      const controls = controlsRef.current;
      if (!controls?.isLocked || !activeRef.current) return;
      camera.getWorldDirection(aim.current);
      onInteract?.(camera.position.x, camera.position.z, aim.current.x, aim.current.z);
    };
    const onDown = (e: KeyboardEvent) => {
      setKey(e.code, true);
      if (e.code === 'KeyE' || e.code === 'Enter') interact();
    };
    const onUp = (e: KeyboardEvent) => setKey(e.code, false);
    const onMouseDown = () => interact();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [camera, onInteract]);

  useFrame((_, dt) => {
    const controls = controlsRef.current;
    if (!controls || !controls.isLocked || !activeRef.current) return;
    const m = move.current;

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
      const resolved = resolveMoveInto(moveOut.current, camera.position.x, camera.position.z, delta.current.x, delta.current.z, grid, PLAYER_RADIUS);
      const dx = resolved.x - camera.position.x;
      const dz = resolved.z - camera.position.z;
      distance = Math.hypot(dx, dz);
      camera.position.x = resolved.x;
      camera.position.z = resolved.z;
    }

    const target = distance > 1e-5 && animateRef.current ? 1 : 0;
    bobIntensity.current += (target - bobIntensity.current) * Math.min(1, dt * BOB_EASE_RATE);
    bobPhase.current = advanceBobPhase(bobPhase.current, distance);
    const bob = computeHeadBob(bobPhase.current, bobIntensity.current);
    // Roll via a local-axis quaternion, not `camera.rotation.z` — the latter's XYZ
    // Euler order fights PointerLockControls' YXZ round-trip and rolls the view
    // upside-down as you look around. See camera-roll.ts.
    camera.position.y = EYE_HEIGHT + bob.dy;
    headBobRoll.apply(camera, bob.roll);

    onProximity?.(camera.position.x, camera.position.z);
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => onLockChange?.(true)}
      onUnlock={() => onLockChange?.(false)}
    />
  );
}

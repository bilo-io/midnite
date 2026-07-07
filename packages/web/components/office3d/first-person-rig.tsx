'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';

import { blockedGrid } from '@/lib/office/layout';
import { useOfficeStore } from '@/lib/office-store';
import { createHeadBobRoll } from '@/lib/office3d/camera-roll';
import { resolveMoveInto, type Vec2 } from '@/lib/office3d/collision';
import { EYE_HEIGHT, MOVE_SPEED, PLAYER_RADIUS } from '@/lib/office3d/constants';
import { advanceBobPhase, computeHeadBob } from '@/lib/office3d/headbob';
import {
  applyInteraction,
  buildTargets,
  pickInteraction,
  raycastPick,
  resolveProximity,
  type InteractionStore,
} from '@/lib/office3d/interactions';
import type { AvatarPlacement } from '@/lib/office3d/agents-3d';
import type { WorldModel } from '@/lib/office3d/world';
import { samplePlayer } from '@/lib/presence-bridge';
import { facingFromDir, unitToPresencePx } from '@/lib/presence-3d';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';

/**
 * Phase 63 Theme B/C — the first-person rig. Theme B: drei pointer-lock mouse-look
 * + WASD/arrow movement with grid-AABB collision (per-axis wall-slide) and a
 * reduced-motion-aware footstep head-bob. **Theme C** turns the rig into a store
 * client: each frame it writes the same proximity flags the 2D scene does
 * (`nearbyId`/`nearBoard`/`nearKitchen`/`nearLibrary`/`nearPlaystation`) and
 * publishes the player's pose to `poseRef` for the minimap; `E`/Enter and a
 * crosshair click dispatch the same panel-open transitions `tryInteract` does, so
 * the shared HUD + modals work untouched. Opening any panel releases the pointer
 * lock (which freezes movement — the useFrame early-returns while unlocked).
 */

const UP = new Vector3(0, 1, 0);

// How fast the head-bob intensity eases toward its target (per second).
const BOB_EASE_RATE = 9;

/** Player pose published each frame for the minimap (position + floor facing). */
export interface PlayerPose {
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
}

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

/**
 * Adapt the office store to the dispatcher's `InteractionStore`. The console
 * (`playstation` action) enters the immersive 3D arcade room (Theme D) rather
 * than opening the RetroGamesMenu modal like 2D does.
 */
function officeInteractionStore(): InteractionStore {
  const s = useOfficeStore.getState();
  return {
    openBoard: s.openBoard,
    toggleBreak: s.toggleBreak,
    openLibrary: s.openLibrary,
    enterArcade: () => s.setCurrentScene('arcade'),
    enterCorner: () => s.setCurrentScene('corner'),
    open: s.open,
  };
}

/** True when any store panel is open — movement + interaction must pause. */
function selectPanelOpen(s: ReturnType<typeof useOfficeStore.getState>): boolean {
  return (
    s.active !== null ||
    s.boardOpen ||
    s.libraryOpen ||
    s.playstationOpen ||
    s.deskPickerOpen ||
    s.characterPickerOpen
  );
}

export function FirstPersonRig({
  spawn,
  placementsRef,
  poseRef,
  onLockChange,
}: {
  spawn: WorldModel['spawn'];
  /** Live avatar placements, read each frame for proximity/interaction. */
  placementsRef: React.RefObject<AvatarPlacement[]>;
  /** Written each frame with the player's floor pose (for the minimap). */
  poseRef?: React.RefObject<PlayerPose>;
  onLockChange?: (locked: boolean) => void;
}) {
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
  const aim = useRef(new Vector3());
  const moveOut = useRef<Vec2>({ x: 0, z: 0 }); // scratch — no per-frame alloc
  // Head-bob state: phase advances by walked distance; intensity eases in/out.
  const bobPhase = useRef(0);
  const bobIntensity = useRef(0);
  // Applies the head-bob roll as a local-axis quaternion (see camera-roll.ts).
  const headBobRoll = useMemo(createHeadBobRoll, []);

  // Spawn at the 2D player's entry tile, at eye height.
  useEffect(() => {
    camera.position.set(spawn.x, spawn.y, spawn.z);
  }, [camera, spawn]);

  // Opening a panel releases the pointer lock so the DOM modal is usable; the
  // useFrame loop early-returns while unlocked, so movement freezes too — matching
  // the 2D scene's `inputEnabled` gate.
  const panelOpen = useOfficeStore(selectPanelOpen);
  useEffect(() => {
    if (panelOpen) controlsRef.current?.unlock();
  }, [panelOpen]);

  useEffect(() => {
    const setKey = (code: string, pressed: boolean) => {
      const key = KEY_MAP[code];
      if (key) move.current[key] = pressed;
    };

    // E/Enter: dispatch by proximity priority (mirrors 2D `tryInteract`).
    const tryInteract = () => {
      const controls = controlsRef.current;
      if (!controls?.isLocked) return; // only while looking around
      if (selectPanelOpen(useOfficeStore.getState())) return;
      const placements = placementsRef.current ?? [];
      const prox = resolveProximity(camera.position.x, camera.position.z, placements);
      applyInteraction(pickInteraction(prox), officeInteractionStore());
    };

    const onDown = (e: KeyboardEvent) => {
      setKey(e.code, true);
      if (e.code === 'KeyE' || e.code === 'Enter') tryInteract();
    };
    const onUp = (e: KeyboardEvent) => setKey(e.code, false);

    // Click while locked: dispatch the interactable under the crosshair.
    const onMouseDown = () => {
      const controls = controlsRef.current;
      if (!controls?.isLocked) return; // an unlocked click is "click-to-lock"
      if (selectPanelOpen(useOfficeStore.getState())) return;
      const placements = placementsRef.current ?? [];
      camera.getWorldDirection(aim.current);
      const action = raycastPick(
        camera.position.x,
        camera.position.z,
        aim.current.x,
        aim.current.z,
        buildTargets(placements),
      );
      applyInteraction(action, officeInteractionStore());
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [camera, placementsRef]);

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
      const resolved = resolveMoveInto(
        moveOut.current,
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

    // Vertical bob rides on eye height; the subtle roll is applied as a quaternion
    // rotation about the camera's local view axis. (Writing `camera.rotation.z`
    // instead uses the camera's XYZ Euler order, which disagrees with the YXZ order
    // PointerLockControls round-trips through — so roll bleeds into yaw/pitch and
    // rolls the view upside-down as you look around. See camera-roll.ts.)
    camera.position.y = EYE_HEIGHT + bob.dy;
    headBobRoll.apply(camera, bob.roll);

    // Proximity → store (dedup'd by the store's own no-op-if-same setters), so the
    // shared HUD prompts + modals react exactly as they do for the 2D scene.
    const prox = resolveProximity(camera.position.x, camera.position.z, placementsRef.current ?? []);
    const store = useOfficeStore.getState();
    store.setNearby(prox.nearbyId);
    store.setNearBoard(prox.nearBoard);
    store.setNearKitchen(prox.nearKitchen);
    store.setNearLibrary(prox.nearLibrary);
    store.setNearPlaystation(prox.nearPlaystation);
    store.setNearDoor(prox.nearDoor);

    // Publish our position to presence (throttled in the hook) — 3D units → wire px.
    const px = unitToPresencePx(camera.position.x, camera.position.z);
    samplePlayer(px.x, px.y, facingFromDir(forward.current.x, forward.current.z), 'office');

    // Publish the player's pose for the minimap.
    if (poseRef?.current) {
      poseRef.current.x = camera.position.x;
      poseRef.current.z = camera.position.z;
      poseRef.current.dirX = forward.current.x;
      poseRef.current.dirZ = forward.current.z;
    }
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => onLockChange?.(true)}
      onUnlock={() => onLockChange?.(false)}
    />
  );
}

'use client';

import { Html, PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3 } from 'three';

import { useOfficeStore } from '@/lib/office-store';
import { buildArcade, type ArcadeCabinet } from '@/lib/office3d/arcade';
import { resolveMove } from '@/lib/office3d/collision';
import { EYE_HEIGHT, MOVE_SPEED, PLAYER_RADIUS } from '@/lib/office3d/constants';
import { advanceBobPhase, computeHeadBob } from '@/lib/office3d/headbob';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';
import { BreakoutCabinet } from './breakout-cabinet';

/**
 * Phase 63 Theme D — the immersive 3D arcade room, reached from the lounge console
 * (`currentScene === 'arcade'`). A dark room with a back-wall cabinet row: the
 * centre cabinet runs the playable Breakout ([`breakout-cabinet.tsx`](./breakout-cabinet.tsx)),
 * the rest are stubs that open the existing `RetroGamesMenu` (`playstationOpen`).
 * Walking to a cabinet + `E` interacts (Breakout dollies the camera onto the
 * screen and routes keys to the game; ESC steps back out); walking to the exit +
 * `E` returns to the office. Movement reuses the same pure `resolveMove` +
 * head-bob helpers as the office rig, against the arcade's own collision grid.
 */

const UP = new Vector3(0, 1, 0);
const BOB_EASE_RATE = 9;
const REACH = 1.7;
const REACH_SQ = REACH * REACH;
const DOLLY_RATE = 5; // camera lerp speed toward the Breakout screen
const BEST_KEY = 'midnite.arcade.breakout-best';

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

function loadBest(): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(BEST_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Static room shell + stub cabinets (the Breakout cabinet renders separately). */
function ArcadeRoom({ model, stubs }: { model: ReturnType<typeof buildArcade>; stubs: ArcadeCabinet[] }) {
  return (
    <group>
      <mesh position={[model.floor.x, 0.02, model.floor.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[model.floor.w, model.floor.d]} />
        <meshStandardMaterial color={0x0b0b16} flatShading />
      </mesh>
      {model.walls.map((w, i) => (
        <mesh key={`wall-${i}`} position={[w.x, w.cy, w.z]}>
          <boxGeometry args={[w.w, w.h, w.d]} />
          <meshStandardMaterial color={0x161626} flatShading />
        </mesh>
      ))}
      {stubs.map((c) => (
        <group key={c.id} position={[c.x, 0, c.z]} rotation={[0, c.rotationY, 0]}>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[0.9, 1.8, 0.7]} />
            <meshStandardMaterial color={0x111827} flatShading />
          </mesh>
          <mesh position={[0, 1.72, 0.36]}>
            <boxGeometry args={[0.86, 0.22, 0.06]} />
            <meshStandardMaterial color={0xa855f7} emissive={0xa855f7} emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, 1.15, 0.37]}>
            <planeGeometry args={[0.62, 0.82]} />
            <meshStandardMaterial color={0x1e1b4b} emissive={0x312e81} emissiveIntensity={0.5} />
          </mesh>
          <Html position={[0, 2.05, 0.2]} center distanceFactor={10} pointerEvents="none">
            <div className="pointer-events-none select-none whitespace-nowrap rounded bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold text-foreground">
              {c.label}
            </div>
          </Html>
        </group>
      ))}
      {/* exit doorway marker on the front wall */}
      <mesh position={[model.exit.x, 1, model.exit.z]}>
        <boxGeometry args={[1.4, 2, 0.15]} />
        <meshStandardMaterial color={0x0ea5e9} emissive={0x0ea5e9} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export function ArcadeScene({ onLockChange }: { onLockChange?: (locked: boolean) => void }) {
  const model = useMemo(() => buildArcade(), []);
  const breakout = useMemo(() => model.cabinets.find((c) => c.kind === 'breakout')!, [model]);
  const stubs = useMemo(() => model.cabinets.filter((c) => c.kind === 'stub'), [model]);

  const controlsRef = useRef<React.ElementRef<typeof PointerLockControls>>(null);
  const move = useRef<MoveState>({ forward: false, back: false, left: false, right: false });
  const { camera } = useThree();
  const { animate } = useAnimationPrefs();
  const animateRef = useRef(animate);
  animateRef.current = animate;

  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const delta = useRef(new Vector3());
  const bobPhase = useRef(0);
  const bobIntensity = useRef(0);

  const [breakoutActive, setBreakoutActive] = useState(false);
  const breakoutActiveRef = useRef(false);
  breakoutActiveRef.current = breakoutActive;
  const [best, setBest] = useState(0);
  const [prompt, setPrompt] = useState<string | null>(null);

  const dollyTarget = useMemo(
    () => new Vector3(breakout.x, 1.18, breakout.z + 1.5),
    [breakout],
  );
  const dollyLook = useMemo(() => new Vector3(breakout.x, 1.12, breakout.z), [breakout]);

  const setScene = useOfficeStore((s) => s.setCurrentScene);
  const openPlaystation = useOfficeStore((s) => s.openPlaystation);

  // Entering the arcade: spawn, load best score, and clear any stale office
  // proximity flags so the shared HUD shows no phantom prompts.
  useEffect(() => {
    camera.position.set(model.spawn.x, model.spawn.y, model.spawn.z);
    setBest(loadBest());
    const s = useOfficeStore.getState();
    s.setNearby(null);
    s.setNearBoard(false);
    s.setNearKitchen(false);
    s.setNearLibrary(false);
    s.setNearPlaystation(false);
    s.setNearDoor(false);
  }, [camera, model.spawn]);

  const persistBest = useCallback((score: number) => {
    setBest(score);
    if (typeof window !== 'undefined') window.localStorage.setItem(BEST_KEY, String(score));
  }, []);

  const exitBreakout = useCallback(() => setBreakoutActive(false), []);

  // Nearest interactable to the player (exit or a cabinet) within reach.
  const nearestTarget = useCallback((): 'exit' | 'breakout' | 'stub' | null => {
    const px = camera.position.x;
    const pz = camera.position.z;
    let best2 = REACH_SQ;
    let hit: 'exit' | 'breakout' | 'stub' | null = null;
    const consider = (x: number, z: number, kind: 'exit' | 'breakout' | 'stub') => {
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d <= best2) {
        best2 = d;
        hit = kind;
      }
    };
    consider(model.exit.x, model.exit.z, 'exit');
    consider(breakout.x, breakout.z, 'breakout');
    for (const s of stubs) consider(s.x, s.z, 'stub');
    return hit;
  }, [camera, model.exit, breakout, stubs]);

  const panelOpen = useOfficeStore((s) => s.playstationOpen);
  useEffect(() => {
    if (panelOpen) controlsRef.current?.unlock();
  }, [panelOpen]);

  useEffect(() => {
    const setKey = (code: string, pressed: boolean) => {
      const key = KEY_MAP[code];
      if (key) move.current[key] = pressed;
    };
    const interact = () => {
      const controls = controlsRef.current;
      if (!controls?.isLocked || breakoutActiveRef.current) return;
      if (useOfficeStore.getState().playstationOpen) return;
      const target = nearestTarget();
      if (target === 'exit') setScene('office');
      else if (target === 'breakout') {
        setBreakoutActive(true);
        controls.unlock();
      } else if (target === 'stub') openPlaystation();
    };
    const onDown = (e: KeyboardEvent) => {
      // While playing Breakout, the cabinet owns the keyboard.
      if (breakoutActiveRef.current) return;
      setKey(e.code, true);
      if (e.code === 'KeyE' || e.code === 'Enter') interact();
    };
    const onUp = (e: KeyboardEvent) => setKey(e.code, false);
    const onMouseDown = () => {
      if (!controlsRef.current?.isLocked || breakoutActiveRef.current) return;
      interact();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [nearestTarget, setScene, openPlaystation]);

  useFrame((_, dt) => {
    // Playing: dolly the camera onto the screen and hold it there.
    if (breakoutActive) {
      const t = Math.min(1, dt * DOLLY_RATE);
      camera.position.lerp(dollyTarget, t);
      camera.lookAt(dollyLook);
      return;
    }

    const controls = controlsRef.current;
    if (!controls || !controls.isLocked) {
      if (prompt !== null) setPrompt(null);
      return;
    }
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
      const resolved = resolveMove(camera.position.x, camera.position.z, delta.current.x, delta.current.z, model.blocked, PLAYER_RADIUS);
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
    camera.position.y = EYE_HEIGHT + bob.dy;
    camera.rotation.z = bob.roll;

    // Contextual prompt for the crosshair-nearest interactable.
    const near = nearestTarget();
    const label = near === 'exit' ? 'E — back to the office' : near === 'breakout' ? 'E — play Breakout' : near === 'stub' ? 'E — browse games' : null;
    if (label !== prompt) setPrompt(label);
  });

  return (
    <group>
      <color attach="background" args={[0x05050a]} />
      <ambientLight intensity={0.55} color={0x8899cc} />
      <pointLight position={[model.floor.x, 3.2, model.floor.z]} intensity={18} color={0xa5b4fc} distance={26} decay={2} />
      <ArcadeRoom model={model} stubs={stubs} />
      <BreakoutCabinet
        position={[breakout.x, 0, breakout.z]}
        rotationY={breakout.rotationY}
        active={breakoutActive}
        best={best}
        onBest={persistBest}
        onExit={exitBreakout}
      />
      <PointerLockControls
        ref={controlsRef}
        onLock={() => onLockChange?.(true)}
        onUnlock={() => onLockChange?.(false)}
      />
      {prompt && !breakoutActive && (
        <Html fullscreen pointerEvents="none">
          <div className="pointer-events-none flex h-full items-end justify-center pb-10">
            <div className="rounded-md border border-border bg-background/85 px-3 py-1.5 text-sm text-foreground shadow-lg backdrop-blur">
              {prompt}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

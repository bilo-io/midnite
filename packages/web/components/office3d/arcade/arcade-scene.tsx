'use client';

import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Vector3 } from 'three';

import { useOfficeStore } from '@/lib/office-store';
import { buildArcade, type ArcadeCabinet } from '@/lib/office3d/arcade';
import { SubSceneRig } from '../scene-rig';
import { BreakoutCabinet } from './breakout-cabinet';

/**
 * Phase 63 Theme D — the immersive 3D arcade room, reached from the lounge console
 * (`currentScene === 'arcade'`). A dark room with a back-wall cabinet row: the
 * centre cabinet runs the playable Breakout ([`breakout-cabinet.tsx`](./breakout-cabinet.tsx)),
 * the rest are stubs that open the existing `RetroGamesMenu` (`playstationOpen`).
 * Walking to a cabinet + `E` interacts (Breakout dollies the camera onto the
 * screen and routes keys to the game; ESC steps back out); walking to the exit +
 * `E` returns to the office. Movement is the shared `<SubSceneRig>`.
 */

const REACH = 1.7;
const REACH_SQ = REACH * REACH;
const DOLLY_RATE = 5; // camera lerp speed toward the Breakout screen
const BEST_KEY = 'midnite.arcade.breakout-best';

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
  const { camera } = useThree();

  const [breakoutActive, setBreakoutActive] = useState(false);
  const [best, setBest] = useState(0);
  const [prompt, setPrompt] = useState<string | null>(null);
  const panelOpen = useOfficeStore((s) => s.playstationOpen);

  const dollyTarget = useMemo(() => new Vector3(breakout.x, 1.18, breakout.z + 1.5), [breakout]);
  const dollyLook = useMemo(() => new Vector3(breakout.x, 1.12, breakout.z), [breakout]);

  const setScene = useOfficeStore((s) => s.setCurrentScene);
  const openPlaystation = useOfficeStore((s) => s.openPlaystation);

  // Entering the arcade: load best score + clear any stale office proximity flags
  // so the shared HUD shows no phantom prompts.
  useEffect(() => {
    setBest(loadBest());
    const s = useOfficeStore.getState();
    s.setNearby(null);
    s.setNearBoard(false);
    s.setNearKitchen(false);
    s.setNearLibrary(false);
    s.setNearPlaystation(false);
    s.setNearDoor(false);
  }, []);

  const persistBest = useCallback((score: number) => {
    setBest(score);
    if (typeof window !== 'undefined') window.localStorage.setItem(BEST_KEY, String(score));
  }, []);

  const exitBreakout = useCallback(() => setBreakoutActive(false), []);

  const nearestTarget = useCallback(
    (px: number, pz: number): 'exit' | 'breakout' | 'stub' | null => {
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
    },
    [model.exit, breakout, stubs],
  );

  const onInteract = useCallback(
    (px: number, pz: number) => {
      if (useOfficeStore.getState().playstationOpen) return;
      const target = nearestTarget(px, pz);
      if (target === 'exit') setScene('office');
      else if (target === 'breakout') setBreakoutActive(true);
      else if (target === 'stub') openPlaystation();
    },
    [nearestTarget, setScene, openPlaystation],
  );

  const onProximity = useCallback(
    (px: number, pz: number) => {
      const near = nearestTarget(px, pz);
      const label =
        near === 'exit'
          ? 'E — back to the office'
          : near === 'breakout'
            ? 'E — play Breakout'
            : near === 'stub'
              ? 'E — browse games'
              : null;
      setPrompt((prev) => (prev === label ? prev : label));
    },
    [nearestTarget],
  );

  // While playing, dolly the camera onto the screen and hold it there.
  useFrame((_, dt) => {
    if (!breakoutActive) return;
    camera.position.lerp(dollyTarget, Math.min(1, dt * DOLLY_RATE));
    camera.lookAt(dollyLook);
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
      <SubSceneRig
        grid={model.blocked}
        spawn={model.spawn}
        active={!breakoutActive && !panelOpen}
        onInteract={onInteract}
        onProximity={onProximity}
        onLockChange={onLockChange}
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

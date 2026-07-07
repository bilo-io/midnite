'use client';

import { Html } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useOfficeStore } from '@/lib/office-store';
import { buildCorner } from '@/lib/office3d/corner';
import { SubSceneRig } from '../scene-rig';

/**
 * Phase 63 Theme E — the 3D corner office, reached through the office door
 * (`currentScene === 'corner'`). A private room with the player's personal desk:
 * walking to the desk + `E` opens the existing `DeskItemPicker` (`deskPickerOpen`),
 * and the chosen desk items render as low-poly props on the desk; walking to the
 * exit + `E` (or the shared HUD "Back to office" button) returns to the office.
 * Movement is the shared `<SubSceneRig>`; a window casts warm light so the room
 * feels lived-in rather than a grey box.
 */

const REACH = 1.7;
const REACH_SQ = REACH * REACH;

/** A desk-item id → a small procedural prop (shape + colour). */
function DeskItemProp({ id, position }: { id: string; position: [number, number, number] }) {
  switch (id) {
    case 'lava-lamp':
      return (
        <mesh position={[position[0], position[1] + 0.11, position[2]]}>
          <cylinderGeometry args={[0.04, 0.06, 0.22, 8]} />
          <meshStandardMaterial color={0xff7eb3} emissive={0x6a4aaa} emissiveIntensity={0.4} flatShading />
        </mesh>
      );
    case 'succulent':
      return (
        <mesh position={[position[0], position[1] + 0.08, position[2]]}>
          <coneGeometry args={[0.07, 0.16, 6]} />
          <meshStandardMaterial color={0x4ade80} flatShading />
        </mesh>
      );
    case 'mug':
      return (
        <mesh position={[position[0], position[1] + 0.05, position[2]]}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 10]} />
          <meshStandardMaterial color={0xf1f5f9} flatShading />
        </mesh>
      );
    case 'rubiks-cube':
      return (
        <mesh position={[position[0], position[1] + 0.06, position[2]]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshStandardMaterial color={0xfbbf24} flatShading />
        </mesh>
      );
    case 'fidget-spinner':
      return (
        <mesh position={[position[0], position[1] + 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.16, 0.05, 0.04]} />
          <meshStandardMaterial color={0x38bdf8} flatShading />
        </mesh>
      );
    case 'photo-frame':
      return (
        <mesh position={[position[0], position[1] + 0.07, position[2]]}>
          <boxGeometry args={[0.14, 0.11, 0.02]} />
          <meshStandardMaterial color={0x9ca3af} flatShading />
        </mesh>
      );
    default:
      return null;
  }
}

export function CornerScene({ onLockChange }: { onLockChange?: (locked: boolean) => void }) {
  const model = useMemo(() => buildCorner(), []);
  const deskItems = useOfficeStore((s) => s.deskItems);
  const setScene = useOfficeStore((s) => s.setCurrentScene);
  const openDeskPicker = useOfficeStore((s) => s.openDeskPicker);
  const panelOpen = useOfficeStore((s) => s.deskPickerOpen || s.characterPickerOpen);
  const [prompt, setPrompt] = useState<string | null>(null);

  // Clear any office proximity flags carried in through the door.
  useEffect(() => {
    const s = useOfficeStore.getState();
    s.setNearby(null);
    s.setNearBoard(false);
    s.setNearKitchen(false);
    s.setNearLibrary(false);
    s.setNearPlaystation(false);
    return () => useOfficeStore.getState().setNearDoor(false);
  }, []);

  const nearest = useCallback(
    (px: number, pz: number): 'exit' | 'desk' | null => {
      const exitD = (px - model.exit.x) ** 2 + (pz - model.exit.z) ** 2;
      const deskD = (px - model.desk.x) ** 2 + (pz - (model.desk.z + 0.7)) ** 2; // stand in front of the desk
      if (exitD <= REACH_SQ && exitD <= deskD) return 'exit';
      if (deskD <= REACH_SQ) return 'desk';
      return null;
    },
    [model.exit, model.desk],
  );

  const onInteract = useCallback(
    (px: number, pz: number) => {
      const s = useOfficeStore.getState();
      if (s.deskPickerOpen || s.characterPickerOpen) return;
      const target = nearest(px, pz);
      if (target === 'exit') setScene('office');
      else if (target === 'desk') openDeskPicker();
    },
    [nearest, setScene, openDeskPicker],
  );

  const onProximity = useCallback(
    (px: number, pz: number) => {
      const target = nearest(px, pz);
      // Mirror 2D: reuse nearDoor so the shared HUD reflects door proximity.
      useOfficeStore.getState().setNearDoor(target === 'exit');
      const label = target === 'exit' ? 'E — back to the office' : target === 'desk' ? 'E — customise your desk' : null;
      setPrompt((prev) => (prev === label ? prev : label));
    },
    [nearest],
  );

  return (
    <group>
      <color attach="background" args={[0x0a0a12]} />
      <ambientLight intensity={0.5} color={0xb8c0e0} />
      {/* warm window light */}
      <pointLight position={[model.window.x - 0.5, model.window.y + 0.6, model.window.z]} intensity={14} color={0xffe8b0} distance={20} decay={2} />
      <directionalLight position={[model.window.x, 3, model.window.z]} intensity={0.5} color={0xfff0cc} />

      {/* floor */}
      <mesh position={[model.floor.x, 0.02, model.floor.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[model.floor.w, model.floor.d]} />
        <meshStandardMaterial color={0x1a1a28} flatShading />
      </mesh>
      {/* walls */}
      {model.walls.map((w, i) => (
        <mesh key={`wall-${i}`} position={[w.x, w.cy, w.z]}>
          <boxGeometry args={[w.w, w.h, w.d]} />
          <meshStandardMaterial color={0x232338} flatShading />
        </mesh>
      ))}
      {/* window pane (glowing) on the east wall */}
      <mesh position={[model.window.x - 0.02, model.window.y, model.window.z]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 1.4]} />
        <meshBasicMaterial color={0xffe8b0} />
      </mesh>

      {/* desk */}
      <mesh position={[model.desk.x, model.desk.cy, model.desk.z]}>
        <boxGeometry args={[model.desk.w, model.desk.h, model.desk.d]} />
        <meshStandardMaterial color={0x8a5a3c} flatShading />
      </mesh>
      {/* chosen desk items */}
      {deskItems.slice(0, model.deskItemSlots.length).map((id, i) => {
        const slot = model.deskItemSlots[i]!;
        return <DeskItemProp key={`${id}-${i}`} id={id} position={[slot.x, slot.y, slot.z]} />;
      })}

      {/* exit doorway (accent) */}
      <mesh position={[model.exit.x, 1, model.exit.z]}>
        <boxGeometry args={[1.4, 2, 0.15]} />
        <meshStandardMaterial color={0x0ea5e9} emissive={0x0ea5e9} emissiveIntensity={0.4} />
      </mesh>

      <SubSceneRig
        grid={model.blocked}
        spawn={model.spawn}
        active={!panelOpen}
        onInteract={onInteract}
        onProximity={onProximity}
        onLockChange={onLockChange}
      />

      {prompt && (
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

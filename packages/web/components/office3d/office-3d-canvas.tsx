'use client';

import { Canvas } from '@react-three/fiber';
import { useMemo, useRef } from 'react';

import { useOfficeStore } from '@/lib/office-store';
import type { OfficePalette } from '@/lib/office/theme';
import { computeAvatarPlacements, createSeatMaps, type AvatarPlacement } from '@/lib/office3d/agents-3d';
import { CAMERA_FAR, CAMERA_FOV, CAMERA_NEAR, MAX_PIXEL_RATIO } from '@/lib/office3d/constants';
import { lightingForHour } from '@/lib/office3d/materials';
import { buildWorld } from '@/lib/office3d/world';
import { ArcadeScene } from './arcade/arcade-scene';
import { AgentAvatars } from './agent-avatars';
import { CornerScene } from './corner/corner-scene';
import { FirstPersonRig, type PlayerPose } from './first-person-rig';
import { MinimapHud } from './minimap-hud';
import { OfficeWorld } from './world/office-world';

/**
 * Phase 63 Theme A/C/D — the r3f stage. Theme A builds the static world + a
 * day/night lighting rig once at mount; **Theme C** adds the live agent/avatar +
 * interaction + minimap layer. **Theme D** branches the scene on the store's
 * `currentScene`: `'arcade'` swaps the office out for the immersive arcade room
 * (reached from the lounge console), everything else renders the office. Both
 * share the one `<Canvas>` + camera, so switching mounts/unmounts each scene's
 * rig cleanly (r3f disposes GPU resources on unmount).
 *
 * Given a `providedHour` the lighting is deterministic — the RTL test passes one
 * so it never touches the wall clock.
 */
export function Office3DCanvas({
  palette,
  onLockChange,
  providedHour,
}: {
  palette: OfficePalette;
  onLockChange?: (locked: boolean) => void;
  providedHour?: number;
}) {
  const world = useMemo(() => buildWorld(), []);
  const lighting = useMemo(
    () => lightingForHour(providedHour ?? new Date().getHours()),
    [providedHour],
  );

  // Live avatars: partition the store's agents into their status-derived seats
  // (stable across refetches via persistent seat maps), mirroring the 2D office.
  const agents = useOfficeStore((s) => s.agents);
  const seatMaps = useRef(createSeatMaps());
  const placements = useMemo(() => computeAvatarPlacements(agents, seatMaps.current), [agents]);

  // Shared refs read each frame by the rig: latest placements (proximity/
  // interaction) + the player's published pose (minimap).
  const placementsRef = useRef<AvatarPlacement[]>(placements);
  placementsRef.current = placements;
  const poseRef = useRef<PlayerPose>({ x: world.spawn.x, z: world.spawn.z, dirX: 0, dirZ: 1 });

  const scene = useOfficeStore((s) => s.currentScene);

  return (
    <Canvas
      dpr={[1, MAX_PIXEL_RATIO]}
      shadows={false}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{
        fov: CAMERA_FOV,
        near: CAMERA_NEAR,
        far: CAMERA_FAR,
        position: [world.spawn.x, world.spawn.y, world.spawn.z],
      }}
    >
      {scene === 'arcade' ? (
        <ArcadeScene onLockChange={onLockChange} />
      ) : scene === 'corner' ? (
        <CornerScene onLockChange={onLockChange} />
      ) : (
        <>
          <color attach="background" args={[palette.background]} />
          <fog attach="fog" args={[palette.background, 12, 46]} />
          <ambientLight color={lighting.ambientColor} intensity={lighting.ambientIntensity} />
          <directionalLight
            color={lighting.sunColor}
            intensity={lighting.sunIntensity}
            position={[lighting.sunPosition.x, lighting.sunPosition.y, lighting.sunPosition.z]}
          />
          <OfficeWorld world={world} palette={palette} />
          <AgentAvatars placements={placements} />
          <FirstPersonRig
            spawn={world.spawn}
            placementsRef={placementsRef}
            poseRef={poseRef}
            onLockChange={onLockChange}
          />
          <MinimapHud placements={placements} poseRef={poseRef} />
        </>
      )}
    </Canvas>
  );
}

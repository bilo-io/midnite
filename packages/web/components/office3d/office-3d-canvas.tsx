'use client';

import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';

import type { OfficePalette } from '@/lib/office/theme';
import { CAMERA_FAR, CAMERA_FOV, CAMERA_NEAR, MAX_PIXEL_RATIO } from '@/lib/office3d/constants';
import { lightingForHour } from '@/lib/office3d/materials';
import { buildWorld } from '@/lib/office3d/world';
import { FirstPersonRig } from './first-person-rig';
import { OfficeWorld } from './world/office-world';

/**
 * Phase 63 Theme A — the r3f stage. Builds the world model + a day/night lighting
 * rig once at mount (static snapshot of the current hour — no per-frame cost,
 * reduced-motion-safe by construction), then renders the world + first-person
 * rig. r3f disposes geometries/materials/textures on unmount, so tab-switching
 * away tears the engine down cleanly (Theme F verifies no context leaks).
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
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 12, 46]} />
      <ambientLight color={lighting.ambientColor} intensity={lighting.ambientIntensity} />
      <directionalLight
        color={lighting.sunColor}
        intensity={lighting.sunIntensity}
        position={[lighting.sunPosition.x, lighting.sunPosition.y, lighting.sunPosition.z]}
      />
      <OfficeWorld world={world} palette={palette} />
      <FirstPersonRig spawn={world.spawn} onLockChange={onLockChange} />
    </Canvas>
  );
}

'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';

import type { OfficePalette } from '@/lib/office/theme';
import { floorColor, furnitureColor, surfaceColor, wallColor } from '@/lib/office3d/materials';
import type { SurfacePlane, FurniturePlacement, Placement, WorldModel } from '@/lib/office3d/world';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';

/**
 * Phase 63 Theme A — the procedural low-poly office, rendered from the pure
 * `WorldModel` ([`lib/office3d/world.ts`](../../../lib/office3d/world.ts)). Every
 * placement becomes a flat-shaded box (or a small cone/cylinder for plants);
 * colours come from the theme-aware palette so 3D follows light/dark like the 2D
 * office. Static geometry with `frustumCulled` (three's default) — the Theme G
 * perf pass adds per-room chunk gating on top.
 */

/** A flat-shaded box at a placement's centre. */
function Box({ placement, color, rotationY = 0 }: { placement: Placement; color: number; rotationY?: number }) {
  return (
    <mesh position={[placement.x, placement.cy, placement.z]} rotation={[0, rotationY, 0]}>
      <boxGeometry args={[placement.w, placement.h, placement.d]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

/** A potted low-poly plant — trunk cylinder + a cone of foliage. */
function Plant({ placement, color }: { placement: FurniturePlacement; color: number }) {
  return (
    <group position={[placement.x, 0, placement.z]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.4, 6]} />
        <meshStandardMaterial color={0x8a5a3c} flatShading />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <coneGeometry args={[0.45, 1.1, 7]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

/**
 * A flat water/turf surface. The pool gets a subtle shimmer — a gentle bob +
 * opacity ripple — so it reads as water rather than a flat sheet; disabled under
 * reduced motion (`useAnimationPrefs`). Turf is static.
 */
function Surface({ surface }: { surface: SurfacePlane }) {
  const ref = useRef<Mesh>(null);
  const { animate } = useAnimationPrefs();
  const shimmer = surface.kind === 'pool' && animate;

  useFrame((state) => {
    if (!shimmer || !ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = 0.07 + Math.sin(t * 1.3) * 0.015;
    const mat = ref.current.material as { opacity: number };
    mat.opacity = 0.72 + Math.sin(t * 0.9) * 0.06;
  });

  return (
    <mesh ref={ref} position={[surface.x, 0.07, surface.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[surface.w, surface.d]} />
      <meshStandardMaterial color={surfaceColor(surface.kind)} transparent opacity={surface.kind === 'pool' ? 0.72 : 0.85} />
    </mesh>
  );
}

export function OfficeWorld({ world, palette }: { world: WorldModel; palette: OfficePalette }) {
  return (
    <group>
      {/* Room floor slabs */}
      {world.floors.map((f, i) => (
        <Box key={`floor-${i}`} placement={f} color={floorColor(f.roomId, palette)} />
      ))}

      {/* Water / turf surfaces laid just over the floor (pool shimmers) */}
      {world.surfaces.map((s, i) => (
        <Surface key={`surface-${i}`} surface={s} />
      ))}

      {/* Walls (merged runs) */}
      {world.walls.map((w, i) => (
        <Box key={`wall-${i}`} placement={w} color={wallColor(w.roomId, palette)} />
      ))}

      {/* Furniture */}
      {world.furniture.map((fp, i) =>
        fp.kind === 'plant' ? (
          <Plant key={`furn-${i}`} placement={fp} color={furnitureColor('plant', fp.roomId, palette)} />
        ) : (
          <Box
            key={`furn-${i}`}
            placement={fp}
            rotationY={fp.rotationY}
            color={furnitureColor(fp.kind, fp.roomId, palette)}
          />
        ),
      )}
    </group>
  );
}

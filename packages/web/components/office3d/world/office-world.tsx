'use client';

import type { OfficePalette } from '@/lib/office/theme';
import { floorColor, furnitureColor, surfaceColor, wallColor } from '@/lib/office3d/materials';
import type { FurniturePlacement, Placement, WorldModel } from '@/lib/office3d/world';

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

export function OfficeWorld({ world, palette }: { world: WorldModel; palette: OfficePalette }) {
  return (
    <group>
      {/* Room floor slabs */}
      {world.floors.map((f, i) => (
        <Box key={`floor-${i}`} placement={f} color={floorColor(f.roomId, palette)} />
      ))}

      {/* Water / turf surfaces laid just over the floor */}
      {world.surfaces.map((s, i) => (
        <mesh key={`surface-${i}`} position={[s.x, 0.07, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[s.w, s.d]} />
          <meshStandardMaterial color={surfaceColor(s.kind)} transparent opacity={s.kind === 'pool' ? 0.72 : 0.85} />
        </mesh>
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

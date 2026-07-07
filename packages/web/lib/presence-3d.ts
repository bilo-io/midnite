/**
 * Phase 64 Theme D — pure conversions between the presence wire space (2D world
 * **pixels**, the space Theme B/C standardised on) and the 3D office's world
 * **units** (1 tile = 1 unit, `world.x = tile.x`, `world.z = tile.y`). Both the 2D
 * and 3D renderers share one wire coordinate system; this is the 3D side's
 * translation, kept pure + unit-tested.
 */

import type { PresenceFacing } from '@midnite/shared';
import { OFFICE_TILE } from '@/lib/office/dimensions';

/** 3D world units → presence wire pixels (what the sampler publishes). */
export function unitToPresencePx(x: number, z: number): { x: number; y: number } {
  return { x: x * OFFICE_TILE, y: z * OFFICE_TILE };
}

/** Presence wire pixels → 3D world units (where a peer avatar is placed). */
export function presencePxToUnit(px: number, py: number): { x: number; z: number } {
  return { x: px / OFFICE_TILE, z: py / OFFICE_TILE };
}

/**
 * The camera's floor-plane forward `(dirX, dirZ)` → a 4-way wire facing. World
 * axes: +x = east (right), −x = west (left), +z = south (down), −z = north (up).
 */
export function facingFromDir(dirX: number, dirZ: number): PresenceFacing {
  if (Math.abs(dirX) >= Math.abs(dirZ)) return dirX >= 0 ? 'right' : 'left';
  return dirZ >= 0 ? 'down' : 'up';
}

/** Yaw (radians) so a +z-facing figure turns to face its wire facing direction. */
export function facingYaw(facing: PresenceFacing): number {
  switch (facing) {
    case 'up':
      return Math.PI; // face −z
    case 'right':
      return -Math.PI / 2; // face +x
    case 'left':
      return Math.PI / 2; // face −x
    default:
      return 0; // 'down' → face +z
  }
}

/**
 * Phase 63 Theme C — pure geometry for the in-canvas 3D minimap HUD. Reuses the
 * 2D minimap math ([`minimap.ts`](../office/minimap.ts)) — which works in **world
 * px** (tile × `OFFICE_TILE`) — by scaling the 3D world (in tile **units**) up by
 * `OFFICE_TILE` first. So the 3D minimap draws the exact same room outlines as 2D.
 *
 * `three`-free: the `<MinimapHud>` component turns these padded-minimap-px points
 * into r3f meshes in an orthographic overlay.
 */

import { OFFICE_TILE } from '@/lib/office/dimensions';
import { worldToMinimap, type MinimapPoint } from '@/lib/office/minimap';

/** Map a 3D world point (units) into padded minimap-px space. */
export function worldUnitToMinimap(x: number, z: number, scale: number, pad = 0): MinimapPoint {
  return worldToMinimap(x * OFFICE_TILE, z * OFFICE_TILE, scale, pad);
}

/**
 * The z-rotation (radians) for the player facing arrow on the minimap, given the
 * camera's forward direction on the floor plane `(dirX, dirZ)`.
 *
 * Minimap axes: +x = east (world +x), and **up** on the panel = north (world −z).
 * A triangle that points +Y by default is rotated so its tip follows the forward
 * vector projected onto that panel, i.e. local direction `(dirX, −dirZ)`.
 * Rotating +Y by θ (CCW) gives `(−sinθ, cosθ)`, so `θ = atan2(−dirX, −dirZ)`.
 */
export function minimapFacing(dirX: number, dirZ: number): number {
  if (Math.hypot(dirX, dirZ) < 1e-6) return 0;
  return Math.atan2(-dirX, -dirZ);
}

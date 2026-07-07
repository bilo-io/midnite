/**
 * Phase 63 — Office 3D world constants (Theme A). Pure numbers, no `three`
 * import, so the world-builder + rig share one source of truth and stay
 * unit-testable. One 2D grid tile maps to one world unit (`TILE_UNIT`), so the
 * whole 34×22 floor plan drops straight into three-space with Y as up:
 *
 *   world.x = tile.x        (east)
 *   world.z = tile.y        (south — the 2D grid's +y row axis)
 *   world.y = height        (up)
 */

import { OFFICE_COLS, OFFICE_ROWS } from '@/lib/office/dimensions';

/** World units per 2D grid tile (1:1 — keeps the floor plan legible in 3D). */
export const TILE_UNIT = 1;

/** Full world extent in units (== grid dimensions, since TILE_UNIT === 1). */
export const WORLD_WIDTH = OFFICE_COLS * TILE_UNIT;
export const WORLD_DEPTH = OFFICE_ROWS * TILE_UNIT;

/** Wall height (units) — tall enough to enclose eye-height first-person view. */
export const WALL_HEIGHT = 3;
/** Wall thickness (units) — one tile, so dividers read as solid. */
export const WALL_THICKNESS = TILE_UNIT;

/** First-person camera eye height (units, ~1.6m human). */
export const EYE_HEIGHT = 1.6;
/** Camera field of view (degrees). */
export const CAMERA_FOV = 70;
/** Near/far planes — far need only cover the ~40-unit diagonal of the floor. */
export const CAMERA_NEAR = 0.05;
export const CAMERA_FAR = 100;

/** Walk speed (units/sec) — tuned to feel like the 2D office's tile cadence. */
export const MOVE_SPEED = 4.5;

/** Device-pixel-ratio cap (Phase 63 G perf budget; Theme A honours it early). */
export const MAX_PIXEL_RATIO = 2;

/**
 * First-person collision radius (units, Phase 63 B). The player is a circle of
 * this radius resolved against blocked tiles; < 0.5 so a 2-tile-wide doorway
 * always clears, big enough that you can't clip a wall corner.
 */
export const PLAYER_RADIUS = 0.3;

/**
 * Head-bob tuning (Phase 63 B). The bob phase advances by walked distance (not
 * time), so cadence tracks speed like real footsteps; one half-cycle per
 * `HEADBOB_STEP_LENGTH` units. Amplitudes are deliberately subtle — a gentle
 * vertical bob + a smaller lateral roll at half the frequency (one sway per two
 * steps). All disabled under reduced motion (the rig zeroes the intensity).
 */
export const HEADBOB_STEP_LENGTH = 0.9;
export const HEADBOB_AMPLITUDE = 0.05;
export const HEADBOB_ROLL = 0.015;

/**
 * Convert a 2D grid tile coordinate to its world-space centre on the floor
 * plane. Tiles are addressed by their top-left corner in the 2D layout, so the
 * centre is offset by half a tile. `y` (up) is supplied by the caller.
 */
export function tileToWorld(tileX: number, tileY: number): { x: number; z: number } {
  return {
    x: (tileX + 0.5) * TILE_UNIT,
    z: (tileY + 0.5) * TILE_UNIT,
  };
}

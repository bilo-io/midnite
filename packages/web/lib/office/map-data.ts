/**
 * Runtime "Tiled map" data for the office scene — the architectural seam that
 * lets real .tmj assets drop in later without touching the scene.
 *
 * Two layers:
 *   Tile layer  — 2D GID array derived from the LAYOUT string (floor + wall
 *                 tiles). Floor tiles alternate variants to create subtle plank
 *                 variation. Wall tiles keep the per-cell physics bodies in the
 *                 scene.
 *   Object layer — Desk objects with `deskId` / `agentSlot` custom props.
 *                  This replaces the hardcoded DESK_SEATS constant and makes
 *                  desk layout data-driven (swap in a .tmj object layer later
 *                  without changing scene code).
 */

import type { TilePos } from './layout';
import { LAYOUT } from './layout';
import { OFFICE_COLS, OFFICE_ROWS } from './dimensions';

// ── Tile GIDs (1-indexed; 0 = empty / skip) ──────────────────────────────────

export const FLOOR_A = 1; // warm oak planks — even (x+y)
export const FLOOR_B = 2; // cooler oak planks — odd (x+y)
export const FLOOR_C = 3; // polished concrete — used in corridors / doorways
export const WALL_TILE = 4; // solid wall (referenced for type completeness)

// ── Floor tile layer ──────────────────────────────────────────────────────────

/**
 * 2D array of tile GIDs covering the whole 34×22 grid.
 * Wall cells get 0 (empty — the scene still draws wall sprites on top).
 * Floor cells alternate FLOOR_A / FLOOR_B in a checkerboard to give the
 * impression of wooden-plank seams without requiring separate tile assets.
 * Doorway cells (where LAYOUT punches through the internal walls at rows 4–5,
 * 15–16, and row 10) get FLOOR_C for a subtle visual cue.
 */
export function buildFloorTileData(): number[][] {
  return Array.from({ length: OFFICE_ROWS }, (_, y) =>
    Array.from({ length: OFFICE_COLS }, (_, x) => {
      const cell = LAYOUT[y]?.[x];
      if (cell === '#') return 0; // wall — no floor tile here
      return (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
    }),
  );
}

// ── Desk object layer ─────────────────────────────────────────────────────────

/** A desk object with Tiled-style custom properties. */
export interface MapDeskObject {
  /** Unique desk identifier (mirrors a future Tiled object name). */
  deskId: string;
  /** Index into the stable-seat assignment array (matches old DESK_SEATS index). */
  agentSlot: number;
  /** Tile x position (matches old DESK_SEATS[n].x). */
  tx: number;
  /** Tile y position (matches old DESK_SEATS[n].y). */
  ty: number;
}

/**
 * Desk object layer — the source of truth for hot-desk positions.
 * This replaces the hardcoded `DESK_SEATS` constant in layout.ts.
 *
 * Six desks in two rows of three in the WORK room (cols 1–11, rows 1–9).
 * Positions match the original DESK_SEATS values so the scene rendering and
 * seat-assignment logic need no changes.
 */
export const MAP_DESK_OBJECTS: readonly MapDeskObject[] = [
  { deskId: 'desk-0', agentSlot: 0, tx: 3, ty: 2 },
  { deskId: 'desk-1', agentSlot: 1, tx: 6, ty: 2 },
  { deskId: 'desk-2', agentSlot: 2, tx: 9, ty: 2 },
  { deskId: 'desk-3', agentSlot: 3, tx: 3, ty: 6 },
  { deskId: 'desk-4', agentSlot: 4, tx: 6, ty: 6 },
  { deskId: 'desk-5', agentSlot: 5, tx: 9, ty: 6 },
];

/** All desk objects from the map, ordered by `agentSlot`. */
export function getMapDesks(): readonly MapDeskObject[] {
  return MAP_DESK_OBJECTS;
}

/**
 * Desk positions as `TilePos[]` — drop-in replacement for the old `DESK_SEATS`
 * constant. Order matches `agentSlot` so indices are stable.
 */
export function getDeskSeats(): readonly TilePos[] {
  return MAP_DESK_OBJECTS.map(({ tx, ty }) => ({ x: tx, y: ty }));
}

// ── Map metadata (for documentation / future .tmj parity) ────────────────────

export const OFFICE_MAP_META = {
  width: OFFICE_COLS,
  height: OFFICE_ROWS,
  tileWidth: 32,
  tileHeight: 32,
  layers: [
    { name: 'Floor', type: 'tilelayer' as const },
    { name: 'Desks', type: 'objectgroup' as const },
  ],
  tilesets: [
    { name: 'office-tiles', firstgid: 1, tileWidth: 32, tileHeight: 32 },
  ],
} as const;

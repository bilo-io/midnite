/**
 * Hot-desk layout (Phase 8 A3). Phaser-free: given the configured **agent-pool
 * capacity**, pack that many desks into the WORK room interior as an evenly
 * spaced grid, and pick a desk sprite scale that keeps them roomy when there are
 * few agents and shrinks them so they still fit when there are many.
 *
 * This replaces the fixed six-desk `MAP_DESK_OBJECTS` layout: the number of hot
 * desks now equals the pool size (`terminal.maxSessions`, surfaced as the pool
 * snapshot's `capacity`).
 */

import { ROOMS, type TilePos } from './layout';

/** The WORK room interior rect (tiles). */
const WORK = ROOMS.find((r) => r.id === 'work')!;

/** Don't pack more desks than the room can hold legibly. */
export const MAX_DESKS = 28;

export interface DeskLayout {
  /** Desk centres as integer tile coords, in stable fill order. */
  seats: TilePos[];
  cols: number;
  rows: number;
  /** Sprite scale for desk/monitor/chair/clutter — larger when fewer desks. */
  deskScale: number;
}

/**
 * Lay out `capacity` desks (clamped to `[1, MAX_DESKS]`) in a grid within the
 * WORK room. Columns are chosen to respect the zone's aspect ratio; seats are
 * the integer tile centres of each grid cell (distinct by construction for any
 * capacity the zone holds). `deskScale` eases from ~1.25 (few) down to ~0.75
 * (many) so the desks read as "a bit larger" normally without overflowing.
 */
export function generateDeskLayout(capacity: number): DeskLayout {
  const n = Math.max(1, Math.min(MAX_DESKS, Math.floor(capacity)));

  // Desk zone: inset from the room walls, leaving the top strip for the sign.
  const zoneX = WORK.x + 1.5;
  const zoneW = WORK.w - 3;
  const zoneY = WORK.y + 1;
  const zoneH = WORK.h - 2;

  const aspect = zoneW / zoneH;
  const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * aspect))));
  const rows = Math.ceil(n / cols);

  const seats: TilePos[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = Math.round(zoneX + (zoneW * (c + 0.5)) / cols);
    const y = Math.round(zoneY + (zoneH * (r + 0.5)) / rows);
    seats.push({ x, y });
  }

  const deskScale = Math.max(0.75, Math.min(1.25, 1.4 - n * 0.03));
  return { seats, cols, rows, deskScale };
}

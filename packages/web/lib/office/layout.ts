/**
 * The office floor plan (Phase 8). Phaser-free data only — the scene reads this to
 * build the room, place furniture, and assign agents to seats; nothing here
 * imports Phaser.
 *
 * Three zones share one room. The left half is open-plan: **hot desks** (work) up
 * top and a **lounge** (TV + console + couches) below, with a **kitchenette** nook
 * in the bottom-left corner. The right half is a walled **board room** (a doorway
 * in the partition) with a conference table and a documents whiteboard.
 *
 *   - Working agents (running / waiting / completed) sit at hot desks → interactable.
 *   - Idle agents chill in the lounge.
 *   - Walking up to the whiteboard opens the board-room projects panel.
 *   - Walking up to the coffee machine + pressing E toggles a coffee break.
 */

import { OFFICE_COLS, OFFICE_ROWS } from './dimensions';

export type TilePos = { x: number; y: number };

// '#' wall, '.' floor. 24×16. Partition at col 13 (doorway at rows 7–8) walls off
// the board room (cols 14–22) from the open-plan left side (cols 1–12).
export const LAYOUT: readonly string[] = [
  '########################',
  '#............#.........#',
  '#............#.........#',
  '#............#.........#',
  '#............#.........#',
  '#............#.........#',
  '#............#.........#',
  '#......................#',
  '#......................#',
  '#............#.........#',
  '#............#.........#',
  '#............#.........#',
  '#............#.........#',
  '#............#.........#',
  '#............#.........#',
  '########################',
];

/** Hot desks (work zone), in fill order — two rows of three. */
export const DESK_SEATS: readonly TilePos[] = [
  { x: 3, y: 2 },
  { x: 7, y: 2 },
  { x: 11, y: 2 },
  { x: 3, y: 5 },
  { x: 7, y: 5 },
  { x: 11, y: 5 },
];

/** Lounge seats (idle agents), in fill order — a couch row, then an armchair row. */
export const LOUNGE_SEATS: readonly TilePos[] = [
  { x: 3, y: 10 },
  { x: 7, y: 10 },
  { x: 11, y: 10 },
  { x: 3, y: 12 },
  { x: 7, y: 12 },
  { x: 11, y: 12 },
];

/** Couches behind the upper lounge seats (one per seat, centred under it). */
export const COUCHES: readonly TilePos[] = [
  { x: 3, y: 10 },
  { x: 7, y: 10 },
  { x: 11, y: 10 },
];

/** Armchairs behind the lower lounge seats. */
export const ARMCHAIRS: readonly TilePos[] = [
  { x: 3, y: 12 },
  { x: 7, y: 12 },
  { x: 11, y: 12 },
];

/** TV + gaming console along the lounge's lower edge (the seats face them). */
export const TV_POS: TilePos = { x: 6, y: 14 };
export const CONSOLE_POS: TilePos = { x: 9, y: 14.2 };

/**
 * Kitchenette in the lounge's bottom-left corner: a coffee machine (the
 * **interactable** — walk up + press E to toggle a coffee break), a counter, and
 * a stool. All pure decor (no colliders). A standalone walled kitchen comes with
 * the multi-room layout (Phase 9 A1); for now it's a corner nook.
 */
export const COFFEE_POS: TilePos = { x: 1.6, y: 13.5 };
export const COUNTER_POS: TilePos = { x: 3.1, y: 13.8 };
export const STOOL_POS: TilePos = { x: 3, y: 12.5 };

/** Board room: a big conference table + the interactable documents whiteboard. */
export const TABLE_POS: TilePos = { x: 18, y: 8 };
export const BOARD_POS: TilePos = { x: 18, y: 1.4 };
/** Decorative chairs around the conference table. */
export const TABLE_CHAIRS: readonly TilePos[] = [
  { x: 15, y: 6 },
  { x: 18, y: 5 },
  { x: 21, y: 6 },
  { x: 15, y: 10 },
  { x: 18, y: 11 },
  { x: 21, y: 10 },
];

/** Potted plants for a bit of life. */
export const PLANTS: readonly TilePos[] = [
  { x: 1.4, y: 1.4 },
  { x: 11.6, y: 13.6 },
  { x: 21.4, y: 13.6 },
];

/** Floor rugs (tile-rect regions): [x, y, w, h] in tiles, decorative. */
export const RUGS: readonly { x: number; y: number; w: number; h: number; color: number }[] = [
  { x: 2, y: 9, w: 10, h: 4, color: 0x3b4252 }, // lounge
  { x: 15, y: 5, w: 7, h: 6, color: 0x2f3a4a }, // board room
];

/** Zone labels: text + tile anchor (top-centre of each zone). */
export const ZONE_LABELS: readonly { text: string; x: number; y: number }[] = [
  { text: 'HOT DESKS', x: 6.5, y: 0.7 },
  { text: 'LOUNGE', x: 7.5, y: 8.4 },
  { text: 'KITCHEN', x: 2.3, y: 11.3 },
  { text: 'BOARD ROOM', x: 18, y: 0.5 },
];

export const PLAYER_SPAWN: TilePos = { x: 6, y: 8 };

/** Sanity: the room dimensions match the layout grid. */
export const LAYOUT_OK = LAYOUT.length === OFFICE_ROWS && LAYOUT.every((r) => r.length === OFFICE_COLS);

/**
 * Walkability grid for agent pathfinding: `true` = blocked (walls + furniture an
 * agent must route around). Seat tiles are intentionally blocked too — A* treats
 * the start/goal seat as a special case so an agent leaves its couch and steps
 * onto its desk, but never walks *through* another piece of furniture en route.
 */
export function blockedGrid(): boolean[][] {
  const grid = LAYOUT.map((row) => Array.from(row, (c) => c === '#'));
  const block = (x: number, y: number) => {
    const xx = Math.round(x);
    const yy = Math.round(y);
    if (grid[yy] && xx >= 0 && xx < grid[yy]!.length) grid[yy]![xx] = true;
  };
  for (const s of DESK_SEATS) block(s.x, s.y);
  for (const s of LOUNGE_SEATS) block(s.x, s.y); // couches + armchairs share these tiles
  block(TV_POS.x, TV_POS.y);
  block(CONSOLE_POS.x, CONSOLE_POS.y);
  for (let y = 6; y <= 10; y++) for (let x = 16; x <= 20; x++) block(x, y); // conference table
  return grid;
}

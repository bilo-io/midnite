/**
 * The office floor plan (Phase 9 A1 — multi-room). Phaser-free data only: the
 * scene reads this to build the rooms, place furniture, and assign agents to
 * seats; nothing here imports Phaser.
 *
 * Six walled **rooms** share one 34×22 grid, connected by doorways into a 3×2
 * arrangement — a top band (work · board · library) over a bottom band
 * (agent pool · communal area · corner office), with 2-tile doorways in every
 * shared wall so the whole map is one connected walkable space:
 *
 *   ┌── WORK ──┬── BOARD ──┬── LIBRARY ──┐   (top band, rows 1–9)
 *   │  desks   │  table    │  shelves    │
 *   ├──────────┼───────────┼─────────────┤   (wall row 10, 3 doorways down)
 *   │   POOL   │ COMMUNAL  │  CORNER →   │   (bottom band, rows 11–20)
 *   └──────────┴───────────┴─────────────┘
 *
 *   - Working agents (running / waiting / completed) sit at WORK hot desks → interactable.
 *   - Idle agents lounge in the AGENT POOL (poolside leisure — pool + swims land in Phase 9 G).
 *   - Walking up to the BOARD whiteboard opens the projects panel.
 *   - The COMMUNAL AREA keeps the coffee break (E to toggle); couches + gaming corner land in Phase 9 E.
 *   - LIBRARY holds bookshelves (the searchable library is Phase 9 C).
 *   - CORNER OFFICE is a doorway to a private scene (Phase 9 F) — a door + label for now.
 *
 * NOTE: this slice re-themes the two bottom rooms (ids + labels + palette) so the
 * Pool (G) and Communal (E) themes can build on them; the actual pool basin /
 * lounge furniture / super-sized TV still live where Phase 8 put them until then.
 *
 * Each room carries its own palette (floor tint + accent) — see lib/office/theme.ts.
 */

import { OFFICE_COLS, OFFICE_ROWS } from './dimensions';

export type TilePos = { x: number; y: number };

export type RoomId = 'work' | 'board' | 'library' | 'pool' | 'communal' | 'corner';

/** A walled room: its interior tile rect + a label and where to anchor it. */
export interface OfficeRoom {
  id: RoomId;
  label: string;
  /** Interior rect (tiles), excluding the surrounding walls. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Label anchor (tile coords) — sits on the room's top wall. */
  lx: number;
  ly: number;
}

// '#' wall, '.' floor. 34×22. Internal walls at cols 12 & 22 and row 10 split the
// space into six rooms; 2-tile doorways are punched in each shared wall:
//   • rows 4–5 open cols 12 & 22 (top band: work↔board↔library)
//   • rows 15–16 open cols 12 & 22 (bottom band: lounge↔kitchen↔corner)
//   • row 10 open at cols 5–6, 16–17, 26–27 (top band ↕ bottom band)
export const LAYOUT: readonly string[] = [
  '##################################',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '#................................#',
  '#................................#',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '#####..#########..########..######',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '#................................#',
  '#................................#',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '#...........#.........#..........#',
  '##################################',
];

/** The six rooms (interior rects) with their label anchors (on the top wall). */
export const ROOMS: readonly OfficeRoom[] = [
  { id: 'work', label: 'HOT DESKS', x: 1, y: 1, w: 11, h: 9, lx: 6.5, ly: 0.8 },
  { id: 'board', label: 'BOARD ROOM', x: 13, y: 1, w: 9, h: 9, lx: 17, ly: 0.8 },
  { id: 'library', label: 'LIBRARY', x: 23, y: 1, w: 10, h: 9, lx: 27.5, ly: 0.8 },
  { id: 'pool', label: 'AGENT POOL', x: 1, y: 11, w: 11, h: 10, lx: 6.5, ly: 10.8 },
  { id: 'communal', label: 'COMMUNAL', x: 13, y: 11, w: 9, h: 10, lx: 17, ly: 10.8 },
  { id: 'corner', label: 'CORNER OFFICE', x: 23, y: 11, w: 10, h: 10, lx: 27.5, ly: 10.8 },
];

/** Hot desks (WORK), in fill order — two rows of three. */
export const DESK_SEATS: readonly TilePos[] = [
  { x: 3, y: 2 },
  { x: 6, y: 2 },
  { x: 9, y: 2 },
  { x: 3, y: 6 },
  { x: 6, y: 6 },
  { x: 9, y: 6 },
];

/** Lounge seats (idle agents), in fill order — a couch row, then an armchair row. */
export const LOUNGE_SEATS: readonly TilePos[] = [
  { x: 3, y: 13 },
  { x: 6, y: 13 },
  { x: 9, y: 13 },
  { x: 3, y: 17 },
  { x: 6, y: 17 },
  { x: 9, y: 17 },
];

/** Couches behind the upper lounge seats (one per seat, centred under it). */
export const COUCHES: readonly TilePos[] = [
  { x: 3, y: 13 },
  { x: 6, y: 13 },
  { x: 9, y: 13 },
];

/** Armchairs behind the lower lounge seats. */
export const ARMCHAIRS: readonly TilePos[] = [
  { x: 3, y: 17 },
  { x: 6, y: 17 },
  { x: 9, y: 17 },
];

/** TV + gaming console along the lounge's lower edge (the seats face them). */
export const TV_POS: TilePos = { x: 6, y: 20 };
export const CONSOLE_POS: TilePos = { x: 9, y: 20.1 };

/**
 * Kitchenette in the KITCHEN room: a coffee machine (the **interactable** — walk
 * up + press E to toggle a coffee break), a counter, and a stool. Pure decor.
 */
export const COFFEE_POS: TilePos = { x: 14, y: 19 };
export const COUNTER_POS: TilePos = { x: 15.6, y: 19.2 };
export const STOOL_POS: TilePos = { x: 15.5, y: 17.7 };

/** Board room: a conference table + the interactable projects whiteboard. */
export const TABLE_POS: TilePos = { x: 17, y: 7 };
export const BOARD_POS: TilePos = { x: 17, y: 1.4 };
/** Decorative chairs around the conference table. */
export const TABLE_CHAIRS: readonly TilePos[] = [
  { x: 15, y: 6 },
  { x: 19, y: 6 },
  { x: 14, y: 7 },
  { x: 20, y: 7 },
  { x: 15, y: 8 },
  { x: 19, y: 8 },
];

/**
 * Library: bookshelves lining the walls + a reading chair. The bookshelf the
 * player walks up to (the Phase 9 C interactable anchor) is `BOOKSHELF_POS`.
 */
export const BOOKSHELF_POS: TilePos = { x: 27, y: 1.5 };
export const BOOKSHELVES: readonly TilePos[] = [
  { x: 25, y: 1 },
  { x: 27, y: 1 },
  { x: 29, y: 1 },
  { x: 31, y: 1 },
  { x: 32, y: 4 },
  { x: 32, y: 6 },
];
export const READING_CHAIR: TilePos = { x: 27, y: 6 };

/** Corner office: a door the player will step through (Phase 9 F). */
export const DOOR_POS: TilePos = { x: 27, y: 20 };

/** Potted plants for a bit of life, one per room corner. */
export const PLANTS: readonly TilePos[] = [
  { x: 1.5, y: 1.5 },
  { x: 20.5, y: 1.5 },
  { x: 31.5, y: 8.5 },
  { x: 1.5, y: 20 },
  { x: 31.5, y: 20 },
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
  for (let y = 6; y <= 8; y++) for (let x = 16; x <= 18; x++) block(x, y); // conference table
  return grid;
}

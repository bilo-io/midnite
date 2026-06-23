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
 *   - Idle agents lie on the AGENT POOL sun loungers and occasionally swim a lane (Phase 9 G).
 *   - Walking up to the BOARD whiteboard opens the projects panel.
 *   - The COMMUNAL AREA: coffee corner (top-left, E to toggle a break), a TV/PS5 gaming lounge (top-right), and pool + ping-pong tables along the bottom (E3).
 *   - LIBRARY holds bookshelves (the searchable library is Phase 9 C).
 *   - CORNER OFFICE is a doorway to a private scene (Phase 9 F) — a door + label for now.
 *
 * Each room carries its own palette (floor tint + accent) — see lib/office/theme.ts.
 */

import type { Status } from '@midnite/shared';

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

/**
 * AGENT POOL (Phase 9 G). Idle agents lie on **sun loungers** along the deck at
 * the top of the room and occasionally swim a lane in the pool below. `LOUNGE_SEATS`
 * keeps its name (the seat slots the live-data hook fills) but the seats are now
 * loungers facing the pool.
 */
export const LOUNGE_SEATS: readonly TilePos[] = [
  { x: 2, y: 12 },
  { x: 4, y: 12 },
  { x: 6, y: 12 },
  { x: 8, y: 12 },
  { x: 10, y: 12 },
];

/**
 * The swimming pool basin (tile rect): non-walkable (agents route around it, the
 * player collides), but the swim behaviour tweens a swimmer through it. Sits below
 * the lounger deck; leaves the right column (cols 10–11) clear as the corridor to
 * the communal-area doorway, and the top rows clear for the work doorway.
 */
export const POOL = { x: 2, y: 15, w: 8, h: 5 } as const;

/**
 * TV + gaming console — the top-right gaming corner of the COMMUNAL area (E3
 * super-sized the TV and restyled the console as a white PS5). The console sits
 * just below/beside the big wall TV; both are collidable.
 */
export const TV_POS: TilePos = { x: 20, y: 11 };
export const CONSOLE_POS: TilePos = { x: 20.9, y: 12.1 };
/** Low gaming/coffee table in front of the lounge — holds four controllers (E3). */
export const GAME_TABLE_POS: TilePos = { x: 19, y: 13.4 };

/**
 * Coffee corner — moved to the **top-left** of the COMMUNAL area (E3). A coffee
 * machine (the **interactable** — walk up + press E to toggle a coffee break), a
 * counter, and a stool. Pure decor apart from the machine.
 */
export const COFFEE_POS: TilePos = { x: 13.5, y: 12 };
export const COUNTER_POS: TilePos = { x: 14.6, y: 11.6 };
export const STOOL_POS: TilePos = { x: 14, y: 13 };

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

/**
 * Greenery & decor (Phase 9 B2). Plants come in three **species/sizes** so the
 * rooms don't all read the same — a `leafy` potted shrub, a tall `palm`, and a
 * small `succulent`. Several per room (corners, beside doorways, flanking the
 * signage), with poolside palms framing the deck. The scene maps each variant to
 * its texture (see `plantTexture`).
 */
export type PlantVariant = 'leafy' | 'palm' | 'succulent';
export interface Plant extends TilePos {
  variant: PlantVariant;
}

export const PLANTS: readonly Plant[] = [
  // Work (hot desks) — corners, clear of the desk rows.
  { x: 1.5, y: 1.5, variant: 'leafy' },
  { x: 10.5, y: 1.5, variant: 'palm' },
  { x: 1.5, y: 8.5, variant: 'succulent' },
  { x: 10.5, y: 8.5, variant: 'leafy' },
  // Board room — flanking the whiteboard wall + the doorway corners.
  { x: 13.5, y: 1.5, variant: 'palm' },
  { x: 20.5, y: 1.5, variant: 'leafy' },
  { x: 13.5, y: 8.5, variant: 'succulent' },
  { x: 20.5, y: 8.5, variant: 'palm' },
  // Library — corners around the bookshelves + reading nook.
  { x: 23.5, y: 1.5, variant: 'leafy' },
  { x: 23.5, y: 8.5, variant: 'palm' },
  { x: 31.5, y: 8.5, variant: 'succulent' },
  // Agent pool — poolside palms framing the deck + a corner shrub.
  { x: 1.4, y: 13.5, variant: 'palm' }, // poolside (left)
  { x: 10.6, y: 13.5, variant: 'palm' }, // poolside (right)
  { x: 10.6, y: 11.5, variant: 'leafy' },
  { x: 1.5, y: 19.5, variant: 'succulent' }, // pool corner
  // Communal area — softening the lounge.
  { x: 13.5, y: 11.5, variant: 'palm' },
  { x: 21, y: 11.5, variant: 'leafy' },
  { x: 21, y: 20, variant: 'succulent' },
  // Corner office — private greenery.
  { x: 23.5, y: 11.5, variant: 'palm' },
  { x: 32, y: 11.5, variant: 'leafy' },
  { x: 23.5, y: 19.5, variant: 'succulent' },
  { x: 31.5, y: 20, variant: 'leafy' },
];

/**
 * Framed wall art (Phase 9 B2) — pictures hung on the **top wall** of the three
 * top-band rooms, offset to either side of the centred name plate (A3), so the
 * walls aren't bare. `y` sits on the wall row, not the floor.
 */
export const WALL_ART: readonly TilePos[] = [
  { x: 3, y: 0.3 }, // work
  { x: 10, y: 0.3 },
  { x: 14.5, y: 0.3 }, // board
  { x: 19.5, y: 0.3 },
  { x: 24.5, y: 0.3 }, // library
  { x: 30.5, y: 0.3 },
];

/**
 * Area rugs (Phase 9 B2) — a warm rug grounds the work room, the library reading
 * nook, and the communal lounge. Pure decor drawn under the furniture.
 */
export const RUGS: readonly TilePos[] = [
  { x: 6, y: 4 }, // work — central walkway
  { x: 27, y: 6 }, // library — under the reading chair
  // (Communal floor accent is now the astro-turf patch under the gaming lounge.)
];

/**
 * Communal lounge seating (E3) — two couches form an **L** tucked into the
 * top-right gaming corner facing the TV, with an armchair completing the seating
 * and an open side to step in and sit. Collidable decor (static bodies, like the
 * TV). The second couch is rotated 90° (its `angle`) to make the L's left arm.
 */
export interface CouchPos extends TilePos {
  /** Rotation in degrees (the L's perpendicular arm); omitted = facing the TV. */
  angle?: number;
}
export const COUCHES: readonly CouchPos[] = [
  { x: 19, y: 14.4 }, // base of the L — long sofa facing the TV
  { x: 17.6, y: 13.2, angle: 90 }, // left arm of the L — rotated upright
];
export const ARMCHAIRS: readonly TilePos[] = [
  { x: 20.8, y: 13.8 }, // completes the lounge on the open (right) side
];

/**
 * Astro-turf patch (E3) — bright green floor of the **top-right gaming corner**
 * (a tiled surface, like the pool water), under the TV/console/lounge. Moved here
 * from the old bottom spot to sit in the same corner as the TV.
 */
export const ASTRO_TURF = { x: 18, y: 12, w: 4, h: 3 } as const;

/**
 * Games tables along the bottom of the COMMUNAL area (E3): a **pool table** in the
 * bottom-right corner and a **ping-pong table** just left of centre, a gap column
 * between them. Both are collidable (see `blockedGrid`).
 */
export const POOL_TABLE = { x: 19, y: 18, w: 3, h: 2 } as const;
export const PING_PONG = { x: 15, y: 18, w: 3, h: 2 } as const;

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
  for (const s of LOUNGE_SEATS) block(s.x, s.y); // sun loungers — agents sit, don't path through
  block(TV_POS.x, TV_POS.y);
  block(CONSOLE_POS.x, CONSOLE_POS.y);
  block(GAME_TABLE_POS.x, GAME_TABLE_POS.y);
  for (let y = 6; y <= 8; y++) for (let x = 16; x <= 18; x++) block(x, y); // conference table
  // Communal games tables (E3) — collidable; the player routes around them.
  for (const t of [POOL_TABLE, PING_PONG])
    for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) block(x, y);
  // Swimming pool basin — non-walkable; the swim behaviour tweens swimmers through it.
  for (let y = POOL.y; y < POOL.y + POOL.h; y++)
    for (let x = POOL.x; x < POOL.x + POOL.w; x++) block(x, y);
  return grid;
}

// ── Phase 31 B — task-status → room routing ──────────────────────────────────

/**
 * Map a task's `Status` to the room where its agent should sit (Phase 31 B).
 *
 * - `wip`      → `'work'`     (hot desks — the agent is actively running)
 * - `waiting`  → `'board'`    (board room — waiting on input / blocked)
 * - `done`     → `'pool'`     (agent pool lounge — run is complete)
 * - everything else (backlog / todo / abandoned) → `null` (agent not on floor)
 *
 * Pure function — no side effects, unit-testable without Phaser.
 */
export function statusToRoom(status: Status | undefined): RoomId | null {
  switch (status) {
    case 'wip':      return 'work';
    case 'waiting':  return 'board';
    case 'done':     return 'pool';
    default:         return null; // backlog/todo/abandoned → not on floor
  }
}


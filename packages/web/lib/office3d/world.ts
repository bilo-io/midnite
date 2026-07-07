/**
 * Phase 63 Theme A — the world builder. A pure transform from the 2D office data
 * ([`layout.ts`](../office/layout.ts)) into engine-agnostic 3D placements: floors,
 * merged wall segments, furniture boxes, and water planes. No `three` import — the
 * r3f components consume this model and turn placements into meshes, so the
 * geometry math stays unit-testable exactly like `lib/office/`.
 *
 * Walls are emitted as **merged runs** (long horizontal spans first, then vertical
 * spans over the leftover cells) rather than one box per tile, so the ~120 wall
 * tiles collapse into a few dozen boxes — a cheap draw-call win before the Theme G
 * perf pass.
 */

import {
  ARMCHAIRS,
  ASTRO_TURF,
  BOARD_POS,
  BOOKSHELVES,
  COFFEE_POS,
  CONSOLE_POS,
  COUCHES,
  COUNTER_POS,
  DESK_SEATS,
  DOOR_POS,
  GAME_TABLE_POS,
  LAYOUT,
  LOUNGE_SEATS,
  PING_PONG,
  PLANTS,
  PLAYER_SPAWN,
  POOL,
  POOL_TABLE,
  READING_CHAIR,
  ROOMS,
  STOOL_POS,
  TABLE_CHAIRS,
  TABLE_POS,
  TV_POS,
  roomForWall,
  type PlantVariant,
  type RoomId,
  type TilePos,
} from '@/lib/office/layout';
import { EYE_HEIGHT, TILE_UNIT, WALL_HEIGHT, tileToWorld } from './constants';

/** A box placement on the floor, addressed by its centre (world units). */
export interface Placement {
  /** World-space centre X (east). */
  x: number;
  /** World-space centre Z (south — the 2D grid's +y row axis). */
  z: number;
  /** Box width along X (units). */
  w: number;
  /** Box depth along Z (units). */
  d: number;
  /** Box height along Y (units). */
  h: number;
  /** Y of the box centre (units) — usually `h / 2` (sitting on the floor). */
  cy: number;
}

/** A room's floor slab. */
export interface FloorSlab extends Placement {
  roomId: RoomId;
}

/** A merged wall segment. `roomId` (nullable) drives per-room wall tinting. */
export interface WallSegment extends Placement {
  roomId: RoomId | null;
  horizontal: boolean;
}

export type FurnitureKind =
  | 'desk'
  | 'chair'
  | 'table'
  | 'whiteboard'
  | 'bookshelf'
  | 'reading-chair'
  | 'coffee'
  | 'counter'
  | 'stool'
  | 'tv'
  | 'console'
  | 'game-table'
  | 'couch'
  | 'armchair'
  | 'pool-table'
  | 'ping-pong'
  | 'plant'
  | 'door';

/** A furniture box, tagged by kind (drives colour + optional decoration). */
export interface FurniturePlacement extends Placement {
  kind: FurnitureKind;
  roomId: RoomId | null;
  /** Yaw in radians (from the 2D `angle` degrees, where present). */
  rotationY: number;
  /** Plant species, present only when `kind === 'plant'`. */
  plant?: PlantVariant;
}

/** A flat translucent surface (pool water, gaming astro-turf). */
export interface SurfacePlane {
  kind: 'pool' | 'astro-turf';
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface WorldModel {
  floors: FloorSlab[];
  walls: WallSegment[];
  furniture: FurniturePlacement[];
  surfaces: SurfacePlane[];
  /** First-person spawn (camera position), at eye height over the 2D spawn tile. */
  spawn: { x: number; y: number; z: number };
}

/** Which room interior contains a tile, or `null` (walls/doorways/outside). */
export function roomAt(tileX: number, tileY: number): RoomId | null {
  for (const r of ROOMS) {
    if (tileX >= r.x && tileX < r.x + r.w && tileY >= r.y && tileY < r.y + r.h) return r.id;
  }
  return null;
}

/**
 * Merge the `#` cells of the layout into as few axis-aligned segments as
 * possible: a first pass takes maximal **horizontal** runs of length ≥ 2, a
 * second pass sweeps the leftover cells into maximal **vertical** runs (down to
 * length 1). Pure over the layout string grid — the core tested invariant is
 * "every wall tile is covered exactly once".
 */
export function mergeWallRuns(layout: readonly string[]): WallSegment[] {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const isWall = (x: number, y: number) => layout[y]?.[x] === '#';
  const consumed: boolean[][] = layout.map((row) => Array.from(row, () => false));
  const segments: WallSegment[] = [];

  const push = (x0: number, y0: number, len: number, horizontal: boolean) => {
    // Wall centre in world space; the run spans `len` tiles along one axis.
    const midTileX = horizontal ? x0 + len / 2 : x0 + 0.5;
    const midTileY = horizontal ? y0 + 0.5 : y0 + len / 2;
    const roomId = roomForWall(Math.floor(horizontal ? x0 + len / 2 : x0), Math.floor(horizontal ? y0 : y0 + len / 2));
    segments.push({
      x: midTileX * TILE_UNIT,
      z: midTileY * TILE_UNIT,
      w: (horizontal ? len : 1) * TILE_UNIT,
      d: (horizontal ? 1 : len) * TILE_UNIT,
      h: WALL_HEIGHT,
      cy: WALL_HEIGHT / 2,
      roomId,
      horizontal,
    });
  };

  // Horizontal pass — maximal runs of length ≥ 2.
  for (let y = 0; y < rows; y++) {
    let x = 0;
    while (x < cols) {
      if (!isWall(x, y) || consumed[y]![x]) {
        x++;
        continue;
      }
      let len = 0;
      while (x + len < cols && isWall(x + len, y) && !consumed[y]![x + len]) len++;
      if (len >= 2) {
        for (let i = 0; i < len; i++) consumed[y]![x + i] = true;
        push(x, y, len, true);
      }
      x += len;
    }
  }

  // Vertical pass — sweep the leftover cells into columns (length ≥ 1).
  for (let x = 0; x < cols; x++) {
    let y = 0;
    while (y < rows) {
      if (!isWall(x, y) || consumed[y]![x]) {
        y++;
        continue;
      }
      let len = 0;
      while (y + len < rows && isWall(x, y + len) && !consumed[y + len]![x]) len++;
      for (let i = 0; i < len; i++) consumed[y + i]![x] = true;
      push(x, y, len, false);
      y += len;
    }
  }

  return segments;
}

/** A furniture footprint (tiles) → box dims (units) + centre offset per kind. */
interface Footprint {
  w: number;
  d: number;
  h: number;
}

const FOOTPRINTS: Record<FurnitureKind, Footprint> = {
  desk: { w: 1.4, d: 0.9, h: 0.75 },
  chair: { w: 0.6, d: 0.6, h: 0.9 },
  table: { w: 3, d: 3, h: 0.75 },
  whiteboard: { w: 3, d: 0.2, h: 1.8 },
  bookshelf: { w: 1.6, d: 0.5, h: 2.2 },
  'reading-chair': { w: 1, d: 1, h: 0.9 },
  coffee: { w: 0.7, d: 0.7, h: 1.1 },
  counter: { w: 1.8, d: 0.7, h: 0.95 },
  stool: { w: 0.5, d: 0.5, h: 0.7 },
  tv: { w: 2.4, d: 0.2, h: 1.4 },
  console: { w: 0.6, d: 0.5, h: 0.5 },
  'game-table': { w: 1.4, d: 0.9, h: 0.45 },
  couch: { w: 2.6, d: 1, h: 0.8 },
  armchair: { w: 1.1, d: 1.1, h: 0.85 },
  'pool-table': { w: 3, d: 2, h: 0.8 },
  'ping-pong': { w: 3, d: 2, h: 0.75 },
  plant: { w: 0.7, d: 0.7, h: 1.4 },
  door: { w: 1.2, d: 0.3, h: 2.2 },
};

function furniture(kind: FurnitureKind, pos: TilePos, angleDeg = 0, plant?: PlantVariant): FurniturePlacement {
  const { x, z } = tileToWorld(pos.x, pos.y);
  const fp = FOOTPRINTS[kind];
  return {
    kind,
    x,
    z,
    w: fp.w,
    d: fp.d,
    h: fp.h,
    cy: fp.h / 2,
    roomId: roomAt(Math.round(pos.x), Math.round(pos.y)),
    rotationY: (angleDeg * Math.PI) / 180,
    ...(plant ? { plant } : {}),
  };
}

/** Centre + world dims of a tile rect (`{x,y,w,h}` in tiles). */
function rectPlane(rect: { x: number; y: number; w: number; h: number }): { x: number; z: number; w: number; d: number } {
  return {
    x: (rect.x + rect.w / 2) * TILE_UNIT,
    z: (rect.y + rect.h / 2) * TILE_UNIT,
    w: rect.w * TILE_UNIT,
    d: rect.h * TILE_UNIT,
  };
}

/**
 * Build the full 3D world model from the 2D office data. Deterministic and pure:
 * the same layout always yields the same placements, so the unit tests can assert
 * exact counts and positions.
 */
export function buildWorld(): WorldModel {
  const floors: FloorSlab[] = ROOMS.map((r) => {
    const plane = rectPlane({ x: r.x, y: r.y, w: r.w, h: r.h });
    return { roomId: r.id, x: plane.x, z: plane.z, w: plane.w, d: plane.d, h: 0.05, cy: 0.025 };
  });

  const walls = mergeWallRuns(LAYOUT);

  const furn: FurniturePlacement[] = [
    ...DESK_SEATS.map((p) => furniture('desk', p)),
    furniture('table', TABLE_POS),
    ...TABLE_CHAIRS.map((p) => furniture('chair', p)),
    furniture('whiteboard', BOARD_POS),
    ...BOOKSHELVES.map((p) => furniture('bookshelf', p)),
    furniture('reading-chair', READING_CHAIR),
    furniture('coffee', COFFEE_POS),
    furniture('counter', COUNTER_POS),
    furniture('stool', STOOL_POS),
    furniture('tv', TV_POS),
    furniture('console', CONSOLE_POS),
    furniture('game-table', GAME_TABLE_POS),
    ...COUCHES.map((c) => furniture('couch', c, c.angle ?? 0)),
    ...ARMCHAIRS.map((p) => furniture('armchair', p)),
    furniture('pool-table', { x: POOL_TABLE.x + POOL_TABLE.w / 2 - 0.5, y: POOL_TABLE.y + POOL_TABLE.h / 2 - 0.5 }),
    furniture('ping-pong', { x: PING_PONG.x + PING_PONG.w / 2 - 0.5, y: PING_PONG.y + PING_PONG.h / 2 - 0.5 }),
    ...PLANTS.map((p) => furniture('plant', p, 0, p.variant)),
    furniture('door', DOOR_POS),
    // Idle-agent loungers read as low stools flanking the pool deck (avatars land in Theme C).
    ...LOUNGE_SEATS.map((p) => furniture('stool', p)),
  ];

  const surfaces: SurfacePlane[] = [
    { kind: 'pool', ...rectPlane(POOL) },
    { kind: 'astro-turf', ...rectPlane(ASTRO_TURF) },
  ];

  const spawnXZ = tileToWorld(PLAYER_SPAWN.x, PLAYER_SPAWN.y);

  return {
    floors,
    walls,
    furniture: furn,
    surfaces,
    spawn: { x: spawnXZ.x, y: EYE_HEIGHT, z: spawnXZ.z },
  };
}

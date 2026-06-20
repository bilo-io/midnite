import { describe, expect, it } from 'vitest';
import { OFFICE_COLS, OFFICE_ROWS } from './dimensions';
import {
  ARMCHAIRS,
  ASTRO_TURF,
  blockedGrid,
  COUCHES,
  LAYOUT,
  LAYOUT_OK,
  PLANTS,
  PLAYER_SPAWN,
  POOL,
  ROOMS,
  RUGS,
  type RoomId,
  type TilePos,
  WALL_ART,
} from './layout';

const isFloor = (x: number, y: number) =>
  y >= 0 && y < OFFICE_ROWS && x >= 0 && x < OFFICE_COLS && LAYOUT[y]![x] === '.';

/** Which room interior (if any) a tile falls inside. */
const roomAt = (x: number, y: number): RoomId | undefined =>
  ROOMS.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)?.id;

/** A decor tile rounds to a floor tile inside some room (so it never sits on a wall). */
const onRoomFloor = (p: TilePos) => {
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  return isFloor(x, y) && roomAt(x, y) !== undefined;
};

/** Flood-fill the walkable floor (4-directional) from a starting tile. */
function reachable(start: { x: number; y: number }): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  seen.add(`${start.x},${start.y}`);
  while (queue.length) {
    const { x, y } = queue.shift()!;
    const neighbours: readonly [number, number][] = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of neighbours) {
      const key = `${nx},${ny}`;
      if (isFloor(nx, ny) && !seen.has(key)) {
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return seen;
}

describe('office layout', () => {
  it('grid matches the declared dimensions', () => {
    expect(LAYOUT_OK).toBe(true);
    expect(LAYOUT).toHaveLength(OFFICE_ROWS);
    for (const row of LAYOUT) expect(row).toHaveLength(OFFICE_COLS);
  });

  it('the player spawns on a floor tile', () => {
    expect(isFloor(PLAYER_SPAWN.x, PLAYER_SPAWN.y)).toBe(true);
  });

  it('every floor tile is one connected walkable space (no walled-off pockets)', () => {
    const reached = reachable(PLAYER_SPAWN);
    let totalFloor = 0;
    for (let y = 0; y < OFFICE_ROWS; y++) {
      for (let x = 0; x < OFFICE_COLS; x++) if (isFloor(x, y)) totalFloor++;
    }
    expect(reached.size).toBe(totalFloor);
  });

  it('every room is reachable from the spawn (doorways connect them)', () => {
    const reached = reachable(PLAYER_SPAWN);
    for (const room of ROOMS) {
      const cx = room.x + Math.floor(room.w / 2);
      const cy = room.y + Math.floor(room.h / 2);
      expect(isFloor(cx, cy), `${room.id} centre is floor`).toBe(true);
      expect(reached.has(`${cx},${cy}`), `${room.id} reachable from spawn`).toBe(true);
    }
  });
});

describe('agent pool', () => {
  it('blocks every pool-basin tile (non-walkable)', () => {
    const grid = blockedGrid();
    for (let y = POOL.y; y < POOL.y + POOL.h; y++) {
      for (let x = POOL.x; x < POOL.x + POOL.w; x++) {
        expect(grid[y]![x], `pool tile ${x},${y} blocked`).toBe(true);
      }
    }
  });

  it('leaves the pool room navigable around the basin (doorways + corridor stay open)', () => {
    const grid = blockedGrid();
    const open = (x: number, y: number) =>
      y >= 0 && y < OFFICE_ROWS && x >= 0 && x < OFFICE_COLS && !grid[y]![x];

    // Flood the non-blocked grid from the spawn.
    const seen = new Set<string>();
    const queue = [PLAYER_SPAWN];
    seen.add(`${PLAYER_SPAWN.x},${PLAYER_SPAWN.y}`);
    while (queue.length) {
      const { x, y } = queue.shift()!;
      const neighbours: readonly [number, number][] = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      for (const [nx, ny] of neighbours) {
        const key = `${nx},${ny}`;
        if (open(nx, ny) && !seen.has(key)) {
          seen.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // The basin must not seal the room: the corridor right of the pool and the
    // communal-doorway approach must still be reachable on foot from the spawn.
    expect(seen.has('10,18'), 'corridor right of the pool').toBe(true);
    expect(seen.has('11,16'), 'communal-doorway approach').toBe(true);
  });
});

describe('decor & greenery (Phase 9 B2)', () => {
  it('places every plant on a floor tile inside a room (never on a wall)', () => {
    for (const p of PLANTS) {
      expect(onRoomFloor(p), `plant ${p.x},${p.y} (${p.variant}) on a room floor`).toBe(true);
    }
  });

  it('grounds every rug on a floor tile inside a room', () => {
    for (const r of RUGS) {
      expect(onRoomFloor(r), `rug ${r.x},${r.y} on a room floor`).toBe(true);
    }
  });

  it('dots every room with at least two plants (greenery everywhere)', () => {
    const perRoom = new Map<RoomId, number>();
    for (const p of PLANTS) {
      const id = roomAt(Math.round(p.x), Math.round(p.y));
      if (id) perRoom.set(id, (perRoom.get(id) ?? 0) + 1);
    }
    for (const room of ROOMS) {
      expect(perRoom.get(room.id) ?? 0, `${room.id} plant count`).toBeGreaterThanOrEqual(2);
    }
  });

  it('uses all three plant species so rooms read differently', () => {
    expect(new Set(PLANTS.map((p) => p.variant))).toEqual(new Set(['leafy', 'palm', 'succulent']));
  });

  it('hangs wall art on a top wall (not floating over the floor)', () => {
    for (const a of WALL_ART) {
      const x = Math.round(a.x);
      const y = Math.round(a.y);
      expect(isFloor(x, y), `wall art ${a.x},${a.y} is on a wall row`).toBe(false);
      expect(y, `wall art ${a.x},${a.y} sits on the top outer wall`).toBe(0);
    }
  });
});

describe('communal furnishings (Phase 9 E2)', () => {
  const COMMUNAL = ROOMS.find((r) => r.id === 'communal')!;
  const inCommunal = (p: TilePos) => roomAt(Math.round(p.x), Math.round(p.y)) === 'communal';

  it('stands every couch + armchair on a communal floor tile', () => {
    for (const c of [...COUCHES, ...ARMCHAIRS]) {
      expect(onRoomFloor(c), `seat ${c.x},${c.y} on a room floor`).toBe(true);
      expect(inCommunal(c), `seat ${c.x},${c.y} is in the communal area`).toBe(true);
    }
  });

  it('keeps the astro-turf patch entirely on communal floor', () => {
    for (let y = ASTRO_TURF.y; y < ASTRO_TURF.y + ASTRO_TURF.h; y++) {
      for (let x = ASTRO_TURF.x; x < ASTRO_TURF.x + ASTRO_TURF.w; x++) {
        expect(isFloor(x, y), `turf tile ${x},${y} is floor`).toBe(true);
        expect(roomAt(x, y), `turf tile ${x},${y} is communal`).toBe('communal');
      }
    }
  });

  it('fits the astro-turf patch inside the communal interior', () => {
    expect(ASTRO_TURF.x).toBeGreaterThanOrEqual(COMMUNAL.x);
    expect(ASTRO_TURF.x + ASTRO_TURF.w).toBeLessThanOrEqual(COMMUNAL.x + COMMUNAL.w);
    expect(ASTRO_TURF.y + ASTRO_TURF.h).toBeLessThanOrEqual(COMMUNAL.y + COMMUNAL.h);
  });
});

import { describe, expect, it } from 'vitest';
import { OFFICE_COLS, OFFICE_ROWS } from './dimensions';
import { blockedGrid, LAYOUT, LAYOUT_OK, PLAYER_SPAWN, POOL, ROOMS } from './layout';

const isFloor = (x: number, y: number) =>
  y >= 0 && y < OFFICE_ROWS && x >= 0 && x < OFFICE_COLS && LAYOUT[y]![x] === '.';

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

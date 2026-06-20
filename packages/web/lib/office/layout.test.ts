import { describe, expect, it } from 'vitest';
import { OFFICE_COLS, OFFICE_ROWS } from './dimensions';
import { LAYOUT, LAYOUT_OK, PLAYER_SPAWN, ROOMS } from './layout';

const isFloor = (x: number, y: number) =>
  y >= 0 && y < OFFICE_ROWS && x >= 0 && x < OFFICE_COLS && LAYOUT[y]![x] === '.';

/** Flood-fill the walkable floor (4-directional) from a starting tile. */
function reachable(start: { x: number; y: number }): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  seen.add(`${start.x},${start.y}`);
  while (queue.length) {
    const { x, y } = queue.shift()!;
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
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

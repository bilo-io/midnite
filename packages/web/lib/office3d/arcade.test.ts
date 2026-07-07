import { describe, expect, it } from 'vitest';

import { ARCADE_COLS, ARCADE_ROWS, buildArcade } from './arcade';
import { EYE_HEIGHT } from './constants';

describe('buildArcade', () => {
  const model = buildArcade();

  it('builds a room of the declared size with four perimeter walls', () => {
    expect(model.cols).toBe(ARCADE_COLS);
    expect(model.rows).toBe(ARCADE_ROWS);
    expect(model.walls).toHaveLength(4);
  });

  it('has exactly one playable Breakout cabinet plus eight stubs', () => {
    const breakout = model.cabinets.filter((c) => c.kind === 'breakout');
    const stubs = model.cabinets.filter((c) => c.kind === 'stub');
    expect(breakout).toHaveLength(1);
    expect(stubs).toHaveLength(8);
    expect(breakout[0]!.id).toBe('breakout');
  });

  it('marks the border + cabinet tiles as blocked, interior as open', () => {
    // Corners + edges are walls.
    expect(model.blocked[0]![0]).toBe(true);
    expect(model.blocked[ARCADE_ROWS - 1]![ARCADE_COLS - 1]).toBe(true);
    // The spawn tile (interior) is open.
    const sx = Math.floor(model.spawn.x);
    const sz = Math.floor(model.spawn.z);
    expect(model.blocked[sz]![sx]).toBe(false);
  });

  it('spawns the player at eye height, inside the room facing the cabinets', () => {
    expect(model.spawn.y).toBe(EYE_HEIGHT);
    expect(model.spawn.x).toBeGreaterThan(0);
    expect(model.spawn.x).toBeLessThan(ARCADE_COLS);
    // Spawn is nearer the front (high z) than the cabinet row (low z).
    expect(model.spawn.z).toBeGreaterThan(model.cabinets[0]!.z);
  });

  it('places the exit near the front wall, not on a cabinet', () => {
    expect(model.exit.z).toBeGreaterThan(model.cabinets[0]!.z);
  });
});

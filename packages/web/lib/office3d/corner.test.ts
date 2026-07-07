import { describe, expect, it } from 'vitest';

import { buildCorner, CORNER_COLS, CORNER_ROWS } from './corner';
import { EYE_HEIGHT } from './constants';

describe('buildCorner', () => {
  const model = buildCorner();

  it('builds a room of the declared size with four perimeter walls', () => {
    expect(model.cols).toBe(CORNER_COLS);
    expect(model.rows).toBe(CORNER_ROWS);
    expect(model.walls).toHaveLength(4);
  });

  it('exposes exactly three desk-item slots on the desktop', () => {
    expect(model.deskItemSlots).toHaveLength(3);
    for (const slot of model.deskItemSlots) {
      expect(slot.y).toBeCloseTo(model.desk.h);
    }
  });

  it('blocks the border + desk tiles and leaves the spawn open', () => {
    expect(model.blocked[0]![0]).toBe(true);
    const sx = Math.floor(model.spawn.x);
    const sz = Math.floor(model.spawn.z);
    expect(model.blocked[sz]![sx]).toBe(false);
  });

  it('spawns at eye height near the front, facing the desk', () => {
    expect(model.spawn.y).toBe(EYE_HEIGHT);
    // Desk is against the back wall (low z); spawn is toward the front (high z).
    expect(model.spawn.z).toBeGreaterThan(model.desk.z);
  });

  it('places the exit by the front wall', () => {
    expect(model.exit.z).toBeGreaterThan(model.desk.z);
  });
});

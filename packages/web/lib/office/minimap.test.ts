import { describe, expect, it } from 'vitest';

import { OFFICE_COLS, OFFICE_ROWS, OFFICE_TILE } from './dimensions';
import { ROOMS } from './layout';
import {
  minimapLayout,
  minimapRooms,
  minimapToWorld,
  worldRectToMinimap,
  worldToMinimap,
} from './minimap';

const WORLD_W = OFFICE_COLS * OFFICE_TILE;
const WORLD_H = OFFICE_ROWS * OFFICE_TILE;

describe('minimapLayout', () => {
  it('preserves the world aspect ratio inside the box', () => {
    const { width, height } = minimapLayout(150, 100);
    expect(width / height).toBeCloseTo(WORLD_W / WORLD_H, 5);
  });

  it('never overflows the max box (smaller-ratio axis wins)', () => {
    const { width, height } = minimapLayout(150, 100);
    expect(width).toBeLessThanOrEqual(150 + 1e-9);
    expect(height).toBeLessThanOrEqual(100 + 1e-9);
    // The world is wider than the box's aspect, so width is the binding axis.
    expect(width).toBeCloseTo(150, 5);
  });

  it('scale maps full world width onto the content width', () => {
    const { scale, width } = minimapLayout(150, 100);
    expect(WORLD_W * scale).toBeCloseTo(width, 5);
  });
});

describe('worldToMinimap', () => {
  it('scales and offsets a point by pad', () => {
    expect(worldToMinimap(100, 200, 0.1, 6)).toEqual({ x: 16, y: 26 });
  });

  it('origin maps to the pad offset', () => {
    expect(worldToMinimap(0, 0, 0.25, 4)).toEqual({ x: 4, y: 4 });
  });
});

describe('minimapToWorld', () => {
  it('is the inverse of worldToMinimap (round-trips)', () => {
    const scale = 0.137;
    const pad = 6;
    const points: [number, number][] = [
      [0, 0],
      [100, 200],
      [WORLD_W, WORLD_H],
    ];
    for (const [wx, wy] of points) {
      const m = worldToMinimap(wx, wy, scale, pad);
      const back = minimapToWorld(m.x, m.y, scale, pad);
      expect(back.x).toBeCloseTo(wx, 6);
      expect(back.y).toBeCloseTo(wy, 6);
    }
  });

  it('undoes the pad offset and scale', () => {
    expect(minimapToWorld(6, 6, 0.5, 6)).toEqual({ x: 0, y: 0 });
    expect(minimapToWorld(16, 26, 0.1, 6)).toEqual({ x: 100, y: 200 });
  });
});

describe('worldRectToMinimap', () => {
  it('scales position and size, offsetting only the position by pad', () => {
    const r = worldRectToMinimap({ x: 100, y: 100, w: 200, h: 80 }, 0.5, 6);
    expect(r).toEqual({ x: 56, y: 56, w: 100, h: 40 });
  });
});

describe('minimapRooms', () => {
  it('returns one entry per room, all RoomIds preserved', () => {
    const rooms = minimapRooms(0.1, 6);
    expect(rooms).toHaveLength(ROOMS.length);
    expect(rooms.map((r) => r.id)).toEqual(ROOMS.map((r) => r.id));
  });

  it('keeps every room rect inside the padded content bounds', () => {
    const { scale, width, height } = minimapLayout(150, 100);
    const pad = 6;
    for (const { rect } of minimapRooms(scale, pad)) {
      expect(rect.x).toBeGreaterThanOrEqual(pad - 1e-9);
      expect(rect.y).toBeGreaterThanOrEqual(pad - 1e-9);
      expect(rect.x + rect.w).toBeLessThanOrEqual(pad + width + 1e-9);
      expect(rect.y + rect.h).toBeLessThanOrEqual(pad + height + 1e-9);
    }
  });
});

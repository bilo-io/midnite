import { describe, expect, it } from 'vitest';

import {
  ARMCHAIRS,
  BOOKSHELVES,
  COUCHES,
  DESK_SEATS,
  LAYOUT,
  LOUNGE_SEATS,
  PLANTS,
  PLAYER_SPAWN,
  ROOMS,
  TABLE_CHAIRS,
} from '@/lib/office/layout';
import { EYE_HEIGHT, TILE_UNIT, WALL_HEIGHT } from './constants';
import { buildWorld, mergeWallRuns, roomAt } from './world';

describe('mergeWallRuns', () => {
  const segments = mergeWallRuns(LAYOUT);

  it('covers every wall tile exactly once', () => {
    const covered = new Set<string>();
    for (const s of segments) {
      // Recover the tile span from the world-space centre + size.
      const len = s.horizontal ? Math.round(s.w / TILE_UNIT) : Math.round(s.d / TILE_UNIT);
      const x0 = Math.round(s.x / TILE_UNIT - (s.horizontal ? len : 1) / 2);
      const y0 = Math.round(s.z / TILE_UNIT - (s.horizontal ? 1 : len) / 2);
      for (let i = 0; i < len; i++) {
        const tx = s.horizontal ? x0 + i : x0;
        const ty = s.horizontal ? y0 : y0 + i;
        const key = `${tx},${ty}`;
        expect(covered.has(key), `tile ${key} covered twice`).toBe(false);
        covered.add(key);
      }
    }

    const wallTiles = new Set<string>();
    LAYOUT.forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (c === '#') wallTiles.add(`${x},${y}`);
      });
    });

    expect(covered.size).toBe(wallTiles.size);
    for (const key of wallTiles) expect(covered.has(key), `wall ${key} uncovered`).toBe(true);
  });

  it('merges long spans instead of one box per tile', () => {
    const wallTileCount = LAYOUT.join('').split('').filter((c) => c === '#').length;
    // The merge must be a real win — far fewer segments than raw tiles.
    expect(segments.length).toBeLessThan(wallTileCount / 2);
  });

  it('gives every segment full wall height sitting on the floor', () => {
    for (const s of segments) {
      expect(s.h).toBe(WALL_HEIGHT);
      expect(s.cy).toBeCloseTo(WALL_HEIGHT / 2);
    }
  });
});

describe('roomAt', () => {
  it('maps an interior tile to its room', () => {
    const work = ROOMS.find((r) => r.id === 'work')!;
    expect(roomAt(work.x, work.y)).toBe('work');
  });

  it('returns null for a wall/perimeter tile', () => {
    expect(roomAt(0, 0)).toBeNull();
  });
});

describe('buildWorld', () => {
  const world = buildWorld();

  it('emits one floor slab per room', () => {
    expect(world.floors).toHaveLength(ROOMS.length);
    expect(new Set(world.floors.map((f) => f.roomId)).size).toBe(ROOMS.length);
  });

  it('places furniture with counts matching the 2D layout data', () => {
    const count = (kind: string) => world.furniture.filter((f) => f.kind === kind).length;
    expect(count('desk')).toBe(DESK_SEATS.length);
    expect(count('chair')).toBe(TABLE_CHAIRS.length);
    expect(count('bookshelf')).toBe(BOOKSHELVES.length);
    expect(count('plant')).toBe(PLANTS.length);
    expect(count('couch')).toBe(COUCHES.length);
    expect(count('armchair')).toBe(ARMCHAIRS.length);
    // Loungers render as stools plus the one kitchen stool.
    expect(count('stool')).toBe(LOUNGE_SEATS.length + 1);
    expect(count('whiteboard')).toBe(1);
    expect(count('door')).toBe(1);
  });

  it('carries plant species through onto plant placements', () => {
    const plants = world.furniture.filter((f) => f.kind === 'plant');
    expect(plants.every((p) => p.plant !== undefined)).toBe(true);
  });

  it('rotates the angled couch (L-arm) into radians', () => {
    const rotated = world.furniture.filter((f) => f.kind === 'couch' && f.rotationY !== 0);
    expect(rotated).toHaveLength(1);
    expect(rotated[0]!.rotationY).toBeCloseTo(Math.PI / 2);
  });

  it('spawns the camera at eye height over the 2D player spawn tile', () => {
    expect(world.spawn.y).toBe(EYE_HEIGHT);
    expect(world.spawn.x).toBeCloseTo((PLAYER_SPAWN.x + 0.5) * TILE_UNIT);
    expect(world.spawn.z).toBeCloseTo((PLAYER_SPAWN.y + 0.5) * TILE_UNIT);
  });

  it('lays a pool and an astro-turf surface plane', () => {
    expect(world.surfaces.map((s) => s.kind).sort()).toEqual(['astro-turf', 'pool']);
  });
});

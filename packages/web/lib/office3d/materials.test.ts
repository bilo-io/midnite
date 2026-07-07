import { describe, expect, it } from 'vitest';

import type { OfficePalette } from '@/lib/office/theme';
import { floorColor, furnitureColor, lightingForHour, surfaceColor, wallColor } from './materials';

const PALETTE: OfficePalette = {
  background: 0x0b0b12,
  floor: 0x14141c,
  wall: 0x2c2c3e,
  text: 0xe5e7eb,
  player: 0x38bdf8,
  highlight: 0xfacc15,
};

const isRgb = (n: number) => Number.isInteger(n) && n >= 0 && n <= 0xffffff;

describe('colour resolution', () => {
  it('produces in-range packed RGB for floors, walls, surfaces', () => {
    expect(isRgb(floorColor('work', PALETTE))).toBe(true);
    expect(isRgb(wallColor('library', PALETTE))).toBe(true);
    expect(isRgb(wallColor(null, PALETTE))).toBe(true);
    expect(isRgb(surfaceColor('pool'))).toBe(true);
    expect(isRgb(surfaceColor('astro-turf'))).toBe(true);
  });

  it('tints each room floor away from the bare theme floor', () => {
    expect(floorColor('library', PALETTE)).not.toBe(PALETTE.floor);
    expect(floorColor('pool', PALETTE)).not.toBe(floorColor('library', PALETTE));
  });

  it('nudges seating toward the room accent but leaves fixed decor alone', () => {
    // Seating picks up the room accent...
    expect(furnitureColor('chair', 'work', PALETTE)).not.toBe(furnitureColor('chair', 'library', PALETTE));
    // ...a whiteboard is a fixed colour regardless of room.
    expect(furnitureColor('whiteboard', 'work', PALETTE)).toBe(furnitureColor('whiteboard', 'board', PALETTE));
  });
});

describe('lightingForHour', () => {
  it('buckets the clock into day/night phases', () => {
    expect(lightingForHour(12).phase).toBe('day');
    expect(lightingForHour(6).phase).toBe('dawn');
    expect(lightingForHour(19).phase).toBe('dusk');
    expect(lightingForHour(2).phase).toBe('night');
  });

  it('makes midday the brightest and night the dimmest', () => {
    expect(lightingForHour(12).sunIntensity).toBeGreaterThan(lightingForHour(2).sunIntensity);
    expect(lightingForHour(12).ambientIntensity).toBeGreaterThan(lightingForHour(19).ambientIntensity);
  });

  it('tolerates out-of-range hours', () => {
    expect(lightingForHour(26).phase).toBe('night'); // 26 → 02:00
    expect(isRgb(lightingForHour(-3).sunColor)).toBe(true);
  });
});

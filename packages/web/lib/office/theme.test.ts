import { describe, expect, it } from 'vitest';
import type { RoomId } from './layout';
import { ROOM_STYLES, roomSignStyle, type OfficePalette } from './theme';

const ROOM_IDS = Object.keys(ROOM_STYLES) as RoomId[];

const palette = (background: number): OfficePalette => ({
  background,
  floor: 0x111111,
  wall: 0x222222,
  text: 0xffffff,
  player: 0x38bdf8,
  highlight: 0xfacc15,
});

describe('roomSignStyle (Phase 9 A3 wall-mounted name plates)', () => {
  it('uses the room accent for the border + text of every room', () => {
    for (const id of ROOM_IDS) {
      const style = roomSignStyle(id, palette(0x000000));
      expect(style.border).toBe(ROOM_STYLES[id].accent);
      expect(style.text).toBe(ROOM_STYLES[id].accent);
    }
  });

  it('drives the plate fill from the theme background, so it flips with light/dark', () => {
    const dark = roomSignStyle('work', palette(0x0b0b12));
    const light = roomSignStyle('work', palette(0xfafafa));
    expect(dark.fill).toBe(0x0b0b12);
    expect(light.fill).toBe(0xfafafa);
    // The accent (border/text) is fixed across themes — only the fill flips.
    expect(dark.border).toBe(light.border);
  });

  it('gives each room a distinct accent so signs read as different rooms', () => {
    const accents = ROOM_IDS.map((id) => roomSignStyle(id, palette(0x000000)).border);
    expect(new Set(accents).size).toBe(ROOM_IDS.length);
  });
});

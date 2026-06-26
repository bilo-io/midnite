import { describe, expect, it } from 'vitest';
import type { RoomId } from './layout';
import {
  blendRgb,
  ROOM_STYLES,
  roomSignStyle,
  WALL_ACCENT_BLEND,
  wallTint,
  type OfficePalette,
} from './theme';

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

describe('blendRgb', () => {
  it('returns a at t=0 and b at t=1', () => {
    expect(blendRgb(0x102030, 0xa0b0c0, 0)).toBe(0x102030);
    expect(blendRgb(0x102030, 0xa0b0c0, 1)).toBe(0xa0b0c0);
  });

  it('blends channel-wise at the midpoint', () => {
    // (0x00 + 0xff)/2 = 127.5 → round 128 = 0x80 per channel
    expect(blendRgb(0x000000, 0xffffff, 0.5)).toBe(0x808080);
  });

  it('clamps t outside [0,1]', () => {
    expect(blendRgb(0x102030, 0xa0b0c0, -1)).toBe(0x102030);
    expect(blendRgb(0x102030, 0xa0b0c0, 2)).toBe(0xa0b0c0);
  });
});

describe('wallTint (Phase 9 A1 per-room wall tints)', () => {
  const p = palette(0x0b0b12);

  it('keeps the base wall colour for un-roomed walls', () => {
    expect(wallTint(null, p)).toBe(p.wall);
  });

  it('nudges each room toward its own accent — distinct per room, never the bare base', () => {
    const tints = ROOM_IDS.map((id) => wallTint(id, p));
    for (const t of tints) expect(t).not.toBe(p.wall);
    expect(new Set(tints).size).toBe(ROOM_IDS.length);
  });

  it('matches a subtle blend of the base wall toward the room accent', () => {
    expect(wallTint('library', p)).toBe(
      blendRgb(p.wall, ROOM_STYLES.library.accent, WALL_ACCENT_BLEND),
    );
  });

  it('flips with the theme base wall (the accent stays fixed)', () => {
    // In production `palette.wall` is theme-driven; vary it to prove the tint
    // tracks the base while the room accent stays the blend target.
    const dark = wallTint('work', { ...palette(0x0b0b12), wall: 0x222233 });
    const light = wallTint('work', { ...palette(0xf4f4f5), wall: 0xcccccc });
    expect(dark).not.toBe(light);
  });
});

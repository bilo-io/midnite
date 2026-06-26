/**
 * Builds the Phaser office colour palette from the app's live CSS design tokens
 * so the canvas follows the light/dark theme (the rest of the app is themed via
 * Tailwind tokens; the canvas can't use CSS, so it reads the resolved values).
 *
 * Structural colours (background, floor, walls, labels) map to theme tokens and
 * flip with light/dark; the scene tints its neutral tiles with them. Decorative
 * colours (player avatar, desk/monitor/chair, highlight) are baked into the
 * generated textures (lib/office/textures.ts) — they read on both themes — so the
 * palette only carries the player tint + highlight as runtime colours.
 */

import { hslTripletToInt } from '@/lib/office/agents';
import type { RoomId } from '@/lib/office/layout';

export interface OfficePalette {
  // Theme-driven (flip with light/dark)
  background: number;
  floor: number;
  wall: number;
  text: number;
  // Fixed decorative
  player: number;
  highlight: number;
}

/**
 * Per-room style: a translucent **floor tint** laid over the theme-driven floor
 * (so the light/dark base still shows through) + an **accent** used for the room
 * label. Each room reads as a distinct space at a glance — warm kitchen, bookish
 * library, sleek board room — without abandoning the token-driven base palette.
 */
export interface RoomStyle {
  floor: number;
  accent: number;
}

export const ROOM_STYLES: Record<RoomId, RoomStyle> = {
  work: { floor: 0x3b4252, accent: 0x60a5fa }, // cool slate / blue
  board: { floor: 0x2f3a4a, accent: 0x38bdf8 }, // sleek navy / sky
  library: { floor: 0x4a3b2a, accent: 0xfbbf24 }, // bookish warm brown / amber
  pool: { floor: 0x1d4e5f, accent: 0x22d3ee }, // tiled aqua / cyan
  communal: { floor: 0x4a3528, accent: 0xfb923c }, // cosy living-room / warm orange
  corner: { floor: 0x2f4a3a, accent: 0x6ee7b7 }, // private green
};

/**
 * Colours for a room's **wall-mounted name plate** (Phase 9 A3): a sign board
 * drawn on the room's top wall instead of a translucent label floating over the
 * floor. The plate **fill follows the theme** (`background`, so it flips with
 * light/dark), while the **border + text** use the room's fixed accent — so the
 * sign reads as that room's at a glance and stays legible on either theme.
 */
export interface RoomSignStyle {
  /** Plate fill — theme-driven, flips with light/dark. */
  fill: number;
  /** Plate border — the room accent. */
  border: number;
  /** Label text — the room accent. */
  text: number;
}

export function roomSignStyle(id: RoomId, palette: OfficePalette): RoomSignStyle {
  const { accent } = ROOM_STYLES[id];
  return { fill: palette.background, border: accent, text: accent };
}

/** Blend two packed `0xRRGGBB` ints by factor `t` ∈ [0,1] (0 → a, 1 → b). Pure. */
export function blendRgb(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const lerp = (ca: number, cb: number) => Math.round(ca + (cb - ca) * k);
  const r = lerp((a >> 16) & 0xff, (b >> 16) & 0xff);
  const g = lerp((a >> 8) & 0xff, (b >> 8) & 0xff);
  const bl = lerp(a & 0xff, b & 0xff);
  return (r << 16) | (g << 8) | bl;
}

/** How far each room's walls are nudged toward its accent — subtle, so the
 * theme-driven base still dominates and light/dark still reads as light/dark. */
export const WALL_ACCENT_BLEND = 0.22;

/**
 * Per-room wall tint (Phase 9 A1): the theme wall colour nudged toward the
 * room's fixed accent so each room's walls read subtly as that space — work
 * blue, library amber, pool cyan — without abandoning the token-driven base
 * (which still flips with light/dark). Outer/un-roomed walls keep the base.
 */
export function wallTint(roomId: RoomId | null, palette: OfficePalette): number {
  if (!roomId) return palette.wall;
  return blendRgb(palette.wall, ROOM_STYLES[roomId].accent, WALL_ACCENT_BLEND);
}

/** Decorative colours that read well on both themes — kept constant. */
const DECOR = {
  player: 0x38bdf8,
  highlight: 0xfacc15,
} as const;

/** Dark-theme fallbacks for when computed styles aren't available (SSR/tests). */
const FALLBACK = {
  background: 0x0b0b12,
  floor: 0x14141c,
  wall: 0x2c2c3e,
  text: 0xe5e7eb,
} as const;

/** Read the app's current theme tokens into a Phaser colour palette. */
export function buildOfficePalette(): OfficePalette {
  const read = (token: string, fallback: number): number => {
    if (typeof window === 'undefined') return fallback;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return raw ? hslTripletToInt(raw) : fallback;
  };
  return {
    background: read('--background', FALLBACK.background),
    floor: read('--muted', FALLBACK.floor),
    wall: read('--secondary', FALLBACK.wall),
    text: read('--foreground', FALLBACK.text),
    ...DECOR,
  };
}

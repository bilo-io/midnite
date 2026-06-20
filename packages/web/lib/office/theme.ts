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

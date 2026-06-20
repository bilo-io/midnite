/**
 * Builds the Phaser office colour palette from the app's live CSS design tokens
 * so the canvas follows the light/dark theme (the rest of the app is themed via
 * Tailwind tokens; the canvas can't use CSS, so it reads the resolved values).
 *
 * Structural colours map to theme tokens and flip with light/dark. Decorative
 * colours (desk wood, screen, avatar, highlight) stay fixed — they read on both
 * themes — as do the status tints (derived from SESSION_STATUS_HUE in agents.ts).
 */

import { hslTripletToInt } from '@/lib/office/agents';

export interface OfficePalette {
  // Theme-driven (flip with light/dark)
  background: number;
  floor: number;
  grid: number;
  wall: number;
  wallStroke: number;
  text: number;
  playerOutline: number;
  // Fixed decorative
  desk: number;
  deskStroke: number;
  monitor: number;
  monitorStroke: number;
  chair: number;
  player: number;
  highlight: number;
}

/** Decorative colours that read well on both themes — kept constant. */
const DECOR = {
  desk: 0x6b4f3a,
  deskStroke: 0x3f2f22,
  monitor: 0x0f172a,
  monitorStroke: 0x334155,
  chair: 0x334155,
  player: 0x38bdf8,
  highlight: 0xfacc15,
} as const;

/** Dark-theme fallbacks for when computed styles aren't available (SSR/tests). */
const FALLBACK = {
  background: 0x0b0b12,
  floor: 0x14141c,
  grid: 0x232334,
  wall: 0x2c2c3e,
  wallStroke: 0x1c1c2a,
  text: 0xe5e7eb,
  playerOutline: 0xffffff,
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
    grid: read('--border', FALLBACK.grid),
    wall: read('--secondary', FALLBACK.wall),
    wallStroke: read('--border', FALLBACK.wallStroke),
    text: read('--foreground', FALLBACK.text),
    playerOutline: read('--foreground', FALLBACK.playerOutline),
    ...DECOR,
  };
}

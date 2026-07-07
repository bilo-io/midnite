/**
 * Phase 63 Theme A — procedural low-poly materials. Pure colour math (no `three`
 * import): given the app's live office palette + a room/furniture kind, resolve a
 * packed `0xRRGGBB` colour the r3f components feed straight into flat-shaded
 * `<meshStandardMaterial color>`. Reuses the 2D office's palette + room accents
 * ([`office/theme.ts`](../office/theme.ts)) so 3D follows the same light/dark
 * theme, and the day/night phase buckets ([`office/daynight.ts`](../office/daynight.ts))
 * so lighting tracks the hour like the 2D floor wash.
 */

import { dayNightPhase, type DayNightPhase } from '@/lib/office/daynight';
import type { RoomId } from '@/lib/office/layout';
import { ROOM_STYLES, blendRgb, wallTint, type OfficePalette } from '@/lib/office/theme';
import type { FurnitureKind } from './world';

/** Floor slab colour — theme floor nudged toward the room's accent tint. */
export function floorColor(roomId: RoomId, palette: OfficePalette): number {
  return blendRgb(palette.floor, ROOM_STYLES[roomId].floor, 0.55);
}

/** Wall colour — reuses the 2D per-room wall tint (theme wall + room accent). */
export function wallColor(roomId: RoomId | null, palette: OfficePalette): number {
  return wallTint(roomId, palette);
}

/** Fixed low-poly furniture colours — read well on both themes, like the 2D decor. */
const FURNITURE_COLORS: Record<FurnitureKind, number> = {
  desk: 0x3f4657,
  chair: 0x545b70,
  table: 0x6b4f34, // wood
  whiteboard: 0xf4f4f0,
  bookshelf: 0x5c4327,
  'reading-chair': 0x7a4a4a,
  coffee: 0x2b2b33,
  counter: 0x8a6b4a,
  stool: 0x4a4f60,
  tv: 0x14141a,
  console: 0xf0f0f2,
  'game-table': 0x5a4634,
  couch: 0x3d5a80,
  armchair: 0x486089,
  'pool-table': 0x1f6b3f,
  'ping-pong': 0x24506e,
  plant: 0x3f7d46, // foliage green
  door: 0x6b4f34,
};

/** Furniture colour by kind; the room accent lightly tints seating so rooms differ. */
export function furnitureColor(kind: FurnitureKind, roomId: RoomId | null, palette: OfficePalette): number {
  const base = FURNITURE_COLORS[kind];
  if ((kind === 'chair' || kind === 'stool' || kind === 'couch' || kind === 'armchair') && roomId) {
    return blendRgb(base, ROOM_STYLES[roomId].accent, 0.15);
  }
  // Reference `palette` so callers can theme-key without an unused-arg lint later.
  return base || palette.floor;
}

/** Water/turf surface colours (translucent planes over the floor). */
export function surfaceColor(kind: 'pool' | 'astro-turf'): number {
  return kind === 'pool' ? 0x1f8fb0 : 0x3f9d4e;
}

/** A resolved lighting rig for a time of day. */
export interface SceneLighting {
  phase: DayNightPhase;
  ambientColor: number;
  ambientIntensity: number;
  sunColor: number;
  sunIntensity: number;
  /** Directional-light position (world units) — a low warm sun at dawn/dusk. */
  sunPosition: { x: number; y: number; z: number };
}

const LIGHTING: Record<DayNightPhase, Omit<SceneLighting, 'phase'>> = {
  dawn: {
    ambientColor: 0xf6b27a,
    ambientIntensity: 0.5,
    sunColor: 0xffcaa0,
    sunIntensity: 0.7,
    sunPosition: { x: 30, y: 12, z: -10 },
  },
  day: {
    ambientColor: 0xffffff,
    ambientIntensity: 0.75,
    sunColor: 0xfff3d0,
    sunIntensity: 1.1,
    sunPosition: { x: 17, y: 30, z: 11 },
  },
  dusk: {
    ambientColor: 0xf08a4b,
    ambientIntensity: 0.45,
    sunColor: 0xff9a55,
    sunIntensity: 0.65,
    sunPosition: { x: 4, y: 10, z: 22 },
  },
  night: {
    ambientColor: 0x1b2a5c,
    ambientIntensity: 0.35,
    sunColor: 0x9fb4ff,
    sunIntensity: 0.4,
    sunPosition: { x: 10, y: 22, z: 20 },
  },
};

/** Resolve the lighting rig for a local hour (0–23; tolerates out-of-range). */
export function lightingForHour(hour: number): SceneLighting {
  const phase = dayNightPhase(hour);
  return { phase, ...LIGHTING[phase] };
}

/**
 * Player character customisation (Phase 9 B1 / F4). The player picks a character
 * style + an optional tint; the choice persists to localStorage (see the office
 * HUD's `useLocalStorage`) and the scene applies it to the player sprite.
 *
 * Pure data + resolution only — no Phaser, no React — so it's unit-testable and
 * the scene/HUD share one source of truth for the valid options.
 */

import type { CharKind } from './textures';

/** A pickable character: a label + the sprite kind/variant it resolves to. */
export interface CharacterOption {
  /** Stable key persisted in localStorage. */
  key: string;
  label: string;
  kind: CharKind;
  /** Variant index within the kind's sprite sheets (human only has 0). */
  variant: number;
}

// The human player + the six robot silhouettes (same variants the agents use),
// so the player can match or stand apart from the pool. Keys are stable.
export const CHARACTER_OPTIONS: readonly CharacterOption[] = [
  { key: 'human', label: 'Human', kind: 'human', variant: 0 },
  { key: 'robot-0', label: 'Robot · Rod', kind: 'robot', variant: 0 },
  { key: 'robot-1', label: 'Robot · Twin', kind: 'robot', variant: 1 },
  { key: 'robot-2', label: 'Robot · Bulb', kind: 'robot', variant: 2 },
  { key: 'robot-3', label: 'Robot · Dish', kind: 'robot', variant: 3 },
  { key: 'robot-4', label: 'Robot · Sensor', kind: 'robot', variant: 4 },
  { key: 'robot-5', label: 'Robot · Fins', kind: 'robot', variant: 5 },
];

// A small palette of player tints. `null` = follow the theme's default player
// colour (what the scene uses when nothing is chosen).
export const PLAYER_TINTS: readonly (number | null)[] = [
  null,
  0x60a5fa,
  0x34d399,
  0xf472b6,
  0xfbbf24,
  0xa78bfa,
  0xf87171,
];

/** The persisted customisation shape (localStorage key `midnite.office.customisation`). */
export interface OfficeCustomisation {
  /** A {@link CHARACTER_OPTIONS} key. */
  character: string;
  /** A {@link PLAYER_TINTS} value, or null to follow the theme. */
  tint: number | null;
}

export const DEFAULT_CUSTOMISATION: OfficeCustomisation = { character: 'human', tint: null };

/** Resolve a customisation to the concrete sprite kind/variant, falling back to the default character. */
export function resolveCharacter(custom: OfficeCustomisation): { kind: CharKind; variant: number } {
  const opt =
    CHARACTER_OPTIONS.find((o) => o.key === custom.character) ?? CHARACTER_OPTIONS[0]!;
  return { kind: opt.kind, variant: opt.variant };
}

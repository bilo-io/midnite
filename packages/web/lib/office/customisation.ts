/**
 * Player character + appearance customisation for the office corner scene.
 * The `OfficeCustomisation` shape is what gets persisted to localStorage.
 */

import type { CharKind } from './textures';

export interface CharacterOption {
  key: string;
  label: string;
  kind: CharKind;
  variant: number;
}

export const CHARACTER_OPTIONS: readonly CharacterOption[] = [
  { key: 'human', label: 'Human', kind: 'human', variant: 0 },
  { key: 'robot-0', label: 'Rod', kind: 'robot', variant: 0 },
  { key: 'robot-1', label: 'Twin', kind: 'robot', variant: 1 },
  { key: 'robot-2', label: 'Bulb', kind: 'robot', variant: 2 },
  { key: 'robot-3', label: 'Dish', kind: 'robot', variant: 3 },
  { key: 'robot-4', label: 'Sensor', kind: 'robot', variant: 4 },
  { key: 'robot-5', label: 'Fins', kind: 'robot', variant: 5 },
];

/** Sprite tint palette for player character (null = no tint). */
export const PLAYER_TINTS: readonly (number | null)[] = [
  null,        // natural
  0x60a5fa,   // blue
  0x34d399,   // green
  0xf472b6,   // pink
  0xfbbf24,   // amber
  0xa78bfa,   // violet
  0xf87171,   // red
];

export interface OfficeCustomisation {
  character: string;
  tint: number | null;
}

export const DEFAULT_CUSTOMISATION: OfficeCustomisation = {
  character: 'human',
  tint: null,
};

/** Resolve a customisation key to a sprite kind + variant index. */
export function resolveCharacter(custom: OfficeCustomisation): { kind: CharKind; variant: number } {
  const opt = CHARACTER_OPTIONS.find((o) => o.key === custom.character);
  return opt ? { kind: opt.kind, variant: opt.variant } : { kind: 'human', variant: 0 };
}

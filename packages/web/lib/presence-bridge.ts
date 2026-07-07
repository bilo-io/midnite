import type { PresenceFacing, PresenceScene } from '@midnite/shared';

/**
 * Phase 64 Theme C — the one-way sink that lets the Phaser office scene (plain,
 * non-React) publish the player's position to the React `use-presence` hook
 * without importing React. The hook registers its throttled `sendMove` here on
 * mount and clears it on unmount; the scene calls `samplePlayer(...)` each frame.
 * Presence is off (no-op) whenever nothing is registered — the scene stays
 * behavior-preserving for solo use.
 */
export type PresenceSampler = (x: number, y: number, facing: PresenceFacing, scene: PresenceScene) => void;

let sampler: PresenceSampler | null = null;

/** The hook registers (or clears with `null`) its throttled move sender. */
export function setPresenceSampler(fn: PresenceSampler | null): void {
  sampler = fn;
}

/** The scene reports the player's world position; a no-op when presence is off. */
export function samplePlayer(x: number, y: number, facing: PresenceFacing, scene: PresenceScene): void {
  sampler?.(x, y, facing, scene);
}

/** Map the 2D scene's facing (+ sprite flip) to the wire facing. */
export function sceneFacing(facing: 'up' | 'down' | 'side', flipX: boolean): PresenceFacing {
  if (facing === 'up') return 'up';
  if (facing === 'down') return 'down';
  return flipX ? 'left' : 'right';
}

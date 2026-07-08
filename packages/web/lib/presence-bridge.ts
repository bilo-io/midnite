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

/**
 * Locate / walk-to sink (Theme E). The active 2D scene registers its A* `walkTo`;
 * the roster / minimap "locate" action calls it with a teammate's world pixels.
 * No-op in the 3D office (its rig is manual WASD) and when nothing is registered.
 */
export type PresenceLocator = (x: number, y: number) => void;

let locator: PresenceLocator | null = null;

/** The 2D scene registers (or clears with `null`) its walk-to handler. */
export function setPresenceLocator(fn: PresenceLocator | null): void {
  locator = fn;
}

/** Whether locate/walk-to is currently available (a 2D scene is mounted). */
export function canLocate(): boolean {
  return locator !== null;
}

/** Walk the player toward a teammate's world position, if locate is available. */
export function locatePlayer(x: number, y: number): void {
  locator?.(x, y);
}

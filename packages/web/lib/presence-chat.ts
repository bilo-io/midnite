/**
 * Phase 64 Theme G — pure proximity-chat helpers, engine-agnostic (no Phaser/
 * three, no React). Both office renderers use these to decide whether a peer's
 * chat bubble is visible (near enough, same scene) and how long it lives.
 *
 * The server fans a chat message to the whole scope; the **client** radius-filters
 * it for display — only rendering it when the sender is within `CHAT_RADIUS_PX`
 * world pixels of the local player. Coordinates are world pixels (the 2D office
 * space); the 3D office converts its own player/peer distances to the same unit
 * before calling `isWithinChatRadius`.
 */

/** Proximity radius (world px) — a teammate must be this near to show a bubble. */
export const CHAT_RADIUS_PX = 200;

/** Chat bubble lifetime bounds (ms): a base + per-char, clamped — long enough to read. */
export const CHAT_TTL_BASE_MS = 4_000;
export const CHAT_TTL_PER_CHAR_MS = 40;
export const CHAT_TTL_MAX_MS = 7_000;

/** How long a chat bubble of `text` stays visible — scales with length, clamped. */
export function chatTtl(text: string): number {
  return Math.min(CHAT_TTL_MAX_MS, CHAT_TTL_BASE_MS + text.length * CHAT_TTL_PER_CHAR_MS);
}

/** Whether a chat bubble is still within its TTL at `now`. */
export function isChatLive(at: number, text: string, now: number): boolean {
  return now - at < chatTtl(text);
}

/** Squared distance test — a teammate at (bx,by) is within `radius` of (ax,ay). */
export function isWithinChatRadius(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  radius = CHAT_RADIUS_PX,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy <= radius * radius;
}

import { z } from 'zod';

/**
 * WebSocket protocol for **office multiplayer presence** (Phase 64).
 *
 * A single endpoint (`/ws/presence`) carries live teammate positions. The client
 * announces itself with `presence.hello`, streams throttled `presence.move`
 * frames, and fires `presence.emote`; the server answers with a `presence.snapshot`
 * on join, then coalesced `presence.peer-updated` batches per tick, plus
 * `presence.peer-left` / `presence.emote` as they happen.
 *
 * Presence is **ephemeral by design** — last-known-state only, never persisted,
 * gone on restart. Unlike the Phase-56 board channels there is **no ring/replay**:
 * a joiner gets a current snapshot, because replaying stale positions is wrong.
 * Coordinates are **world pixels** (the 2D Phaser office's space); the 3D office
 * maps them through the same tile scale.
 */

/** Which office scene a peer is standing in (drives per-scene render scoping). */
export const PresenceSceneSchema = z.enum(['office', 'corner', 'arcade']);
export type PresenceScene = z.infer<typeof PresenceSceneSchema>;

/** Coarse 4-way facing; the 2D renderer maps left/right → side + horizontal flip. */
export const PresenceFacingSchema = z.enum(['up', 'down', 'left', 'right']);
export type PresenceFacing = z.infer<typeof PresenceFacingSchema>;

/** Display name bound — kept short; the server may override it with a verified identity. */
const nameSchema = z.string().min(1).max(40);
/** Avatar variant: -1 = human, 0–5 = robot design index (matches the office textures). */
const variantSchema = z.number().int().min(-1).max(5);
/** Sprite tint (0xRRGGBB) or null for the natural palette. */
const tintSchema = z.number().int().nonnegative().nullable();

// ---- client -> server ----

/** Announce identity + avatar on join (and again when the avatar picker changes). */
export const PresenceHelloMessageSchema = z.object({
  type: z.literal('presence.hello'),
  name: nameSchema,
  variant: variantSchema,
  tint: tintSchema,
  /** Ghost mode: the server holds you but excludes you from everyone else's view. */
  ghost: z.boolean().default(false),
});

/** A throttled position push (~10Hz, dedup'd when stationary). */
export const PresenceMoveMessageSchema = z.object({
  type: z.literal('presence.move'),
  x: z.number(),
  y: z.number(),
  facing: PresenceFacingSchema,
  scene: PresenceSceneSchema,
});

/** Fire an emote over your own avatar (rendered ephemerally to peers). */
export const PresenceEmoteMessageSchema = z.object({
  type: z.literal('presence.emote'),
  emoji: z.string().min(1).max(8),
});

export const ClientPresenceMessageSchema = z.discriminatedUnion('type', [
  PresenceHelloMessageSchema,
  PresenceMoveMessageSchema,
  PresenceEmoteMessageSchema,
]);

// ---- server -> client ----

/** A renderable peer — identity + last-known position. `peerId` is server-assigned. */
export const PresencePeerSchema = z.object({
  peerId: z.string().min(1),
  name: nameSchema,
  variant: variantSchema,
  tint: tintSchema,
  x: z.number(),
  y: z.number(),
  facing: PresenceFacingSchema,
  scene: PresenceSceneSchema,
});
export type PresencePeer = z.infer<typeof PresencePeerSchema>;

/**
 * Full current roster, sent once when a client joins (no stale replay). Carries
 * the recipient's own server-assigned `selfId` so the client can filter its own
 * echo out of the coalesced `peer-updated` batches (one batch fans out to the
 * whole team, sender included).
 */
export const PresenceSnapshotMessageSchema = z.object({
  type: z.literal('presence.snapshot'),
  selfId: z.string().min(1),
  peers: z.array(PresencePeerSchema),
});

/** Coalesced batch of peers that changed this tick (moved / newly renderable). */
export const PresencePeerUpdatedMessageSchema = z.object({
  type: z.literal('presence.peer-updated'),
  peers: z.array(PresencePeerSchema),
});

/** A peer left (disconnect, stale timeout, or entered ghost mode). */
export const PresencePeerLeftMessageSchema = z.object({
  type: z.literal('presence.peer-left'),
  peerId: z.string().min(1),
});

/** A peer's emote, fanned out to the team (ephemeral; clients give it a short TTL). */
export const PresenceServerEmoteMessageSchema = z.object({
  type: z.literal('presence.emote'),
  peerId: z.string().min(1),
  emoji: z.string().min(1).max(8),
});

export const ServerPresenceMessageSchema = z.discriminatedUnion('type', [
  PresenceSnapshotMessageSchema,
  PresencePeerUpdatedMessageSchema,
  PresencePeerLeftMessageSchema,
  PresenceServerEmoteMessageSchema,
]);

// ---- inferred types ----

export type PresenceHelloMessage = z.infer<typeof PresenceHelloMessageSchema>;
export type PresenceMoveMessage = z.infer<typeof PresenceMoveMessageSchema>;
export type PresenceEmoteMessage = z.infer<typeof PresenceEmoteMessageSchema>;
export type ClientPresenceMessage = z.infer<typeof ClientPresenceMessageSchema>;

export type PresenceSnapshotMessage = z.infer<typeof PresenceSnapshotMessageSchema>;
export type PresencePeerUpdatedMessage = z.infer<typeof PresencePeerUpdatedMessageSchema>;
export type PresencePeerLeftMessage = z.infer<typeof PresencePeerLeftMessageSchema>;
export type PresenceServerEmoteMessage = z.infer<typeof PresenceServerEmoteMessageSchema>;
export type ServerPresenceMessage = z.infer<typeof ServerPresenceMessageSchema>;

export const PRESENCE_WS_PATH = '/ws/presence';

// ---- REST summary (Theme F: app-wide surfaces) ----

/**
 * A lightweight, team-scoped roll-up of who's in the office, served by
 * `GET /presence/summary`. Powers the nav pill + dashboard widget from anywhere
 * in the app without holding a presence socket. Ghosts are excluded server-side;
 * ephemeral (in-memory), so it reflects live state at request time.
 */
export const PresenceSummaryEntrySchema = z.object({
  name: nameSchema,
  scene: PresenceSceneSchema,
  tint: tintSchema,
});
export type PresenceSummaryEntry = z.infer<typeof PresenceSummaryEntrySchema>;

export const PresenceSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  peers: z.array(PresenceSummaryEntrySchema),
});
export type PresenceSummary = z.infer<typeof PresenceSummarySchema>;

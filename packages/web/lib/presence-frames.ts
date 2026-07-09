/**
 * Phase 64 Theme B — pure presence state reduction + the move-sampler decision,
 * engine-agnostic (no Phaser/three, no React). The store ([`presence-store.ts`](./presence-store.ts))
 * wraps `reducePresence`; the sampler in [`use-presence.ts`](../hooks/use-presence.ts)
 * gates sends with `shouldSendMove`. Kept pure so both are unit-testable.
 *
 * Peer coordinates are **world pixels** (the 2D office space); the 3D office maps
 * them through its tile scale.
 */

import type { PresenceFacing, PresenceScene, ServerPresenceMessage } from '@midnite/shared';

/** A remote teammate as the client tracks them (target position + last emote). */
export interface PeerView {
  peerId: string;
  name: string;
  variant: number;
  tint: number | null;
  /** Latest reported (target) position — the interp buffer eases toward it. */
  x: number;
  y: number;
  facing: PresenceFacing;
  scene: PresenceScene;
  /** Ephemeral emote with the epoch-ms it arrived (renderers TTL it). */
  emote?: { emoji: string; at: number };
  /** Ephemeral chat bubble with the epoch-ms it arrived (renderers TTL + radius-filter it). */
  chat?: { text: string; at: number };
  /** Epoch ms of the last frame touching this peer. */
  lastUpdate: number;
}

/** The engine-agnostic presence slice — `self` is this client's own peerId. */
export interface PresenceSlice {
  self: string | null;
  peers: Record<string, PeerView>;
}

export const emptyPresence = (): PresenceSlice => ({ self: null, peers: {} });

/**
 * Fold a server frame into the slice, returning a new slice. The client's **own**
 * peerId (`self`) is filtered out of snapshots/updates — the local player is
 * rendered from its own state, not the peer map (the server fans one batch to the
 * whole team, sender included).
 */
export function reducePresence(
  slice: PresenceSlice,
  frame: ServerPresenceMessage,
  now: number,
): PresenceSlice {
  switch (frame.type) {
    case 'presence.snapshot': {
      const peers: Record<string, PeerView> = {};
      for (const p of frame.peers) {
        if (p.peerId === frame.selfId) continue;
        peers[p.peerId] = { ...p, lastUpdate: now };
      }
      return { self: frame.selfId, peers };
    }
    case 'presence.peer-updated': {
      const peers = { ...slice.peers };
      for (const p of frame.peers) {
        if (p.peerId === slice.self) continue;
        // Preserve any live emote + chat bubble across a position update.
        const prev = peers[p.peerId];
        peers[p.peerId] = { ...p, emote: prev?.emote, chat: prev?.chat, lastUpdate: now };
      }
      return { ...slice, peers };
    }
    case 'presence.peer-left': {
      if (!slice.peers[frame.peerId]) return slice;
      const peers = { ...slice.peers };
      delete peers[frame.peerId];
      return { ...slice, peers };
    }
    case 'presence.emote': {
      const existing = slice.peers[frame.peerId];
      if (!existing) return slice; // emote for an unknown/own peer — ignore
      return {
        ...slice,
        peers: { ...slice.peers, [frame.peerId]: { ...existing, emote: { emoji: frame.emoji, at: now } } },
      };
    }
    case 'presence.chat': {
      const existing = slice.peers[frame.peerId];
      if (!existing) return slice; // chat for an unknown/own peer — ignore
      return {
        ...slice,
        peers: { ...slice.peers, [frame.peerId]: { ...existing, chat: { text: frame.text, at: now } } },
      };
    }
  }
}

/** A position sample the client considers sending. */
export interface MoveSample {
  x: number;
  y: number;
  facing: PresenceFacing;
  scene: PresenceScene;
}

const samplesEqual = (a: MoveSample, b: MoveSample): boolean =>
  a.x === b.x && a.y === b.y && a.facing === b.facing && a.scene === b.scene;

/**
 * Decide whether to send a move now — the ~10Hz throttle + stationary dedup, with
 * a keepalive so a motionless teammate isn't reaped by the server stale timeout.
 *
 * - **keepalive:** if `keepaliveMs` elapsed since the last send, always send
 *   (refreshes the server's lastSeen even when standing still);
 * - **throttle:** otherwise never send more often than `minIntervalMs`;
 * - **dedup:** otherwise skip when the sample is identical to the last sent one.
 */
export function shouldSendMove(
  prev: MoveSample | null,
  next: MoveSample,
  lastSentAt: number,
  now: number,
  minIntervalMs: number,
  keepaliveMs: number,
): boolean {
  if (now - lastSentAt >= keepaliveMs) return true;
  if (now - lastSentAt < minIntervalMs) return false;
  if (prev && samplesEqual(prev, next)) return false;
  return true;
}

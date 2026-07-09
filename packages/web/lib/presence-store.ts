'use client';

import { create } from 'zustand';
import type { ServerPresenceMessage } from '@midnite/shared';
import { emptyPresence, reducePresence, type PeerView } from './presence-frames';

/**
 * Phase 64 Theme B — the engine-agnostic presence store (the
 * [`office-store.ts`](./office-store.ts) vanilla-Zustand pattern). Holds remote
 * `peers` (keyed by peerId, world-pixel target positions) + this client's own
 * `self` slice. **No Phaser/three imports** — the 2D and 3D offices are two
 * renderers of this one slice; the office store stays untouched.
 *
 * Frame reduction lives in the pure [`presence-frames.ts`](./presence-frames.ts)
 * `reducePresence`; the store is a thin dispatcher so both are testable.
 */
interface PresenceState {
  /** This client's server-assigned peerId (null until the snapshot arrives). */
  self: string | null;
  /** Remote teammates by peerId (own peer filtered out by the reducer). */
  peers: Record<string, PeerView>;
  /** Whether the presence socket is currently live. */
  connected: boolean;
  /** Ghost mode: you see everyone, nobody sees you (server-enforced; Theme F UI). */
  ghost: boolean;
  /** Your own most recent emote (optimistic) — rendered over your avatar (Theme E). */
  selfEmote: { emoji: string; at: number } | null;
  /** Your own most recent chat bubble (optimistic) — rendered over your avatar (Theme G). */
  selfChat: { text: string; at: number } | null;
  /** Apply one decoded server frame. */
  applyFrame(frame: ServerPresenceMessage, now: number): void;
  setConnected(connected: boolean): void;
  setGhost(ghost: boolean): void;
  /** Record an emote you just fired (also sent to the server via the hook). */
  setSelfEmote(emoji: string, at: number): void;
  /** Record a chat message you just sent (also sent to the server via the hook). */
  setSelfChat(text: string, at: number): void;
  /** Clear all presence state (on office teardown / disconnect). */
  reset(): void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  ...emptyPresence(),
  connected: false,
  ghost: false,
  selfEmote: null,
  selfChat: null,
  applyFrame: (frame, now) =>
    set((s) => reducePresence({ self: s.self, peers: s.peers }, frame, now)),
  setConnected: (connected) => set((s) => (s.connected === connected ? s : { connected })),
  setGhost: (ghost) => set((s) => (s.ghost === ghost ? s : { ghost })),
  setSelfEmote: (emoji, at) => set({ selfEmote: { emoji, at } }),
  setSelfChat: (text, at) => set({ selfChat: { text, at } }),
  reset: () => set({ ...emptyPresence(), connected: false, selfEmote: null, selfChat: null }),
}));

/** Peer list as an array (renderers iterate); stable-ish for a given peers map. */
export function presencePeerList(peers: Record<string, PeerView>): PeerView[] {
  return Object.values(peers);
}

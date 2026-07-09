import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional, type OnModuleDestroy } from '@nestjs/common';
import type { WebSocket } from 'ws';
import type {
  ClientPresenceMessage,
  MidniteConfig,
  PresenceFacing,
  PresenceHelloMessage,
  PresenceMoveMessage,
  PresencePeer,
  PresenceScene,
  PresenceSummary,
  ServerPresenceMessage,
} from '@midnite/shared';
import { sanitizeChatText } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { WsBroadcastService } from '../ws/ws-broadcast.service';
import { WsMetricsService } from '../ws/ws-metrics.service';

/** Verified/guest identity resolved by the gateway at handshake time. */
export interface PresenceIdentity {
  userId: string | null;
  teamId: string | null;
  /** A verified display name (JWT email) that overrides the hello name; null in guest mode. */
  verifiedName: string | null;
}

/** In-memory last-known state for one presence connection. */
interface PeerState {
  peerId: string;
  userId: string | null;
  teamId: string | null;
  name: string;
  variant: number;
  tint: number | null;
  ghost: boolean;
  x: number;
  y: number;
  facing: PresenceFacing;
  scene: PresenceScene;
  /** False until the first move — a peer with no position isn't renderable yet. */
  hasPosition: boolean;
  /** Changed since the last tick — batched into the next peer-updated frame. */
  dirty: boolean;
  /** Last time any frame arrived — drives the stale-departure sweep. */
  lastSeenAt: number;
  /** Chat rate-limit token bucket (Theme G): tokens left + last refill time. */
  chatTokens: number;
  chatRefilledAt: number;
}

/**
 * Phase 64 Theme A — the presence service. Holds a **last-known-state map** keyed
 * by connection (no DB, no ring — ephemeral by design) and fans out coalesced
 * updates on a fixed tick.
 *
 * Fan-out uses the presence service's **own** socket set (the peers map), not the
 * shared `ConnectionRegistry` (which mixes task/terminal/presence sockets) — it
 * calls `WsBroadcastService.toAll(scopedSockets, …)` so presence frames only ever
 * reach presence sockets, while still getting the shared backpressure guard.
 * Scope is the team (JWT on) or the global null-team scope (local default).
 *
 * The tick loop starts in {@link start} (called by the gateway on module init) so
 * unit tests can drive `runTick(now)` deterministically without a live timer.
 */
@Injectable()
export class PresenceService implements OnModuleDestroy {
  private readonly logger = new Logger(PresenceService.name);
  private readonly peers = new Map<WebSocket, PeerState>();
  private readonly tickMs: number;
  private readonly staleMs: number;
  private readonly chatBurst: number;
  private readonly chatRefillMs: number;
  /** Injectable clock — tests pass a fake so the stale sweep is deterministic. */
  private readonly clock: () => number;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    // Explicit token: a bare typed param + the trailing non-injectable `clock`
    // param made Nest resolve this to `undefined` at runtime (every presence
    // socket then crashed on its first frame). Match the other gateways and pin it.
    @Inject(WsBroadcastService) private readonly broadcast: WsBroadcastService,
    @Optional() @Inject(MIDNITE_CONFIG) config?: MidniteConfig,
    @Optional() @Inject(WsMetricsService) private readonly metrics?: WsMetricsService,
    // `@Optional()` (no provider for a bare function) so Nest injects `undefined`
    // here instead of choking on the constructor; tests pass a fake positionally.
    @Optional() clock?: () => number,
  ) {
    this.clock = clock ?? (() => Date.now());
    this.tickMs = config?.presence.tickMs ?? 100;
    this.staleMs = config?.presence.staleMs ?? 15_000;
    this.chatBurst = config?.presence.chatBurst ?? 5;
    this.chatRefillMs = config?.presence.chatRefillMs ?? 1_000;
  }

  /** Begin the coalescing/sweep tick (gateway calls this on module init). */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.runTick(), this.tickMs);
    // Don't keep the process alive for presence alone.
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  // ---- connection lifecycle -------------------------------------------------

  /**
   * A client announced itself. Assigns a peerId (authoritative `userId` when JWT
   * is on, else a random guest id), coalesces a duplicate connection from the
   * same user to this newest one, and replies with a scope snapshot.
   */
  join(client: WebSocket, identity: PresenceIdentity, hello: PresenceHelloMessage): void {
    const now = this.clock();
    // JWT verified → server-authoritative peerId + name (a forged hello name is
    // ignored); guest → trust the hello (no-auth is documented as local-only).
    const peerId = identity.userId ? `user:${identity.userId}` : `guest:${randomUUID()}`;
    const name = identity.verifiedName ?? hello.name;

    // Coalesce a prior connection from the same user to the newest socket: drop
    // the stale entry silently (its peerId lives on via this connection).
    if (identity.userId) {
      for (const [sock, st] of this.peers) {
        if (sock !== client && st.userId === identity.userId) this.peers.delete(sock);
      }
    }

    this.peers.set(client, {
      peerId,
      userId: identity.userId,
      teamId: identity.teamId,
      name,
      variant: hello.variant,
      tint: hello.tint,
      ghost: hello.ghost,
      x: 0,
      y: 0,
      facing: 'down',
      scene: 'office',
      hasPosition: false,
      dirty: false,
      lastSeenAt: now,
      chatTokens: this.chatBurst,
      chatRefilledAt: now,
    });
    this.reportCount();
    this.sendSnapshot(client, peerId, identity.teamId);
  }

  /** A parsed client frame arrived on `client`. */
  handleMessage(client: WebSocket, msg: ClientPresenceMessage): void {
    const state = this.peers.get(client);
    if (!state) return; // frame before hello — ignore
    state.lastSeenAt = this.clock();
    switch (msg.type) {
      case 'presence.hello': {
        // Re-hello (e.g. avatar picker changed) — refresh avatar fields. A
        // verified (JWT) peer keeps its server name; a guest may rename.
        if (!state.userId) state.name = msg.name;
        state.variant = msg.variant;
        state.tint = msg.tint;
        const wasVisible = state.hasPosition && !state.ghost;
        state.ghost = msg.ghost;
        state.dirty = true;
        // Toggling ghost ON while already visible must retract the avatar from
        // existing viewers now — the coalescing tick only *omits* ghosts, it
        // never departs one, so without this a mid-session ghost stays on screen.
        // (Ghost → visible needs nothing: the dirty flag re-emits a peer-updated.)
        if (wasVisible && state.ghost) {
          this.fanout(state.teamId, { type: 'presence.peer-left', peerId: state.peerId });
        }
        break;
      }
      case 'presence.move':
        this.applyMove(state, msg);
        break;
      case 'presence.emote':
        this.fanoutEmote(state, msg.emoji);
        break;
      case 'presence.chat':
        this.fanoutChat(state, msg.text);
        break;
    }
  }

  /** A connection closed — drop it and tell the scope, if it was visible. */
  leave(client: WebSocket): void {
    const state = this.peers.get(client);
    if (!state) return;
    this.peers.delete(client);
    this.reportCount();
    if (state.hasPosition && !state.ghost) {
      this.fanout(state.teamId, { type: 'presence.peer-left', peerId: state.peerId });
    }
  }

  // ---- tick: coalesced fan-out + stale sweep --------------------------------

  /** One tick: sweep stale peers, then emit one coalesced batch per scope. */
  runTick(now = this.clock()): void {
    // Stale sweep — a peer silent past staleMs (client stopped keepalive'ing or
    // half-open socket) departs, well before the 30s WS heartbeat.
    for (const [sock, st] of [...this.peers]) {
      if (now - st.lastSeenAt > this.staleMs) {
        this.peers.delete(sock);
        if (st.hasPosition && !st.ghost) {
          this.fanout(st.teamId, { type: 'presence.peer-left', peerId: st.peerId });
        }
      }
    }
    this.reportCount();

    // Coalesce dirty renderable peers into one peer-updated per scope.
    const byScope = new Map<string, PresencePeer[]>();
    for (const st of this.peers.values()) {
      if (!st.dirty || !st.hasPosition || st.ghost) continue;
      st.dirty = false;
      const key = st.teamId ?? ' global';
      const list = byScope.get(key) ?? [];
      list.push(toPeer(st));
      byScope.set(key, list);
    }
    for (const [scopeKey, peers] of byScope) {
      const teamId = scopeKey === ' global' ? null : scopeKey;
      this.fanout(teamId, { type: 'presence.peer-updated', peers });
    }
  }

  /**
   * Team-scoped roll-up for the REST surfaces (Theme F). Counts renderable,
   * non-ghost peers in the caller's scope (`teamId`; null = the local/global
   * scope) — the same visibility rule the fan-out uses.
   */
  summary(teamId: string | null): PresenceSummary {
    const peers: PresenceSummary['peers'] = [];
    for (const st of this.peers.values()) {
      if (st.teamId !== teamId || st.ghost || !st.hasPosition) continue;
      peers.push({ name: st.name, scene: st.scene, tint: st.tint });
    }
    return { count: peers.length, peers };
  }

  // ---- internals ------------------------------------------------------------

  private applyMove(state: PeerState, msg: PresenceMoveMessage): void {
    state.x = msg.x;
    state.y = msg.y;
    state.facing = msg.facing;
    state.scene = msg.scene;
    state.hasPosition = true;
    state.dirty = true;
  }

  private fanoutEmote(state: PeerState, emoji: string): void {
    if (state.ghost || !state.hasPosition) return;
    this.fanout(state.teamId, { type: 'presence.emote', peerId: state.peerId, emoji });
  }

  /**
   * Proximity chat (Theme G). A ghost never chats (it would reveal them). The
   * text is sanitized to plain text (dropped if empty), then rate-limited by a
   * per-peer token bucket before fan-out to the scope. Clients radius-filter it
   * for display — the server sends to the whole scope (coalescing-free, like
   * emotes) and never persists anything.
   */
  private fanoutChat(state: PeerState, rawText: string): void {
    if (state.ghost || !state.hasPosition) return;
    const text = sanitizeChatText(rawText);
    if (!text) return;
    if (!this.takeChatToken(state)) return; // over rate limit — drop silently
    this.fanout(state.teamId, { type: 'presence.chat', peerId: state.peerId, text });
  }

  /**
   * Token-bucket check for chat: refill `chatBurst` tokens at one per
   * `chatRefillMs`, then spend one. Returns false (drop the message) when empty.
   */
  private takeChatToken(state: PeerState): boolean {
    const now = this.clock();
    const refill = Math.floor((now - state.chatRefilledAt) / this.chatRefillMs);
    if (refill > 0) {
      state.chatTokens = Math.min(this.chatBurst, state.chatTokens + refill);
      state.chatRefilledAt += refill * this.chatRefillMs;
    }
    if (state.chatTokens < 1) return false;
    state.chatTokens -= 1;
    return true;
  }

  private sendSnapshot(client: WebSocket, selfId: string, teamId: string | null): void {
    const peers: PresencePeer[] = [];
    for (const st of this.peers.values()) {
      if (st.peerId === selfId || !st.hasPosition || st.ghost || st.teamId !== teamId) continue;
      peers.push(toPeer(st));
    }
    this.send(client, { type: 'presence.snapshot', selfId, peers });
  }

  /** Every presence socket in a scope (team, or the global null-team scope). */
  private scopeSockets(teamId: string | null): WebSocket[] {
    const out: WebSocket[] = [];
    for (const [sock, st] of this.peers) if (st.teamId === teamId) out.push(sock);
    return out;
  }

  private fanout(teamId: string | null, frame: ServerPresenceMessage): void {
    const sockets = this.scopeSockets(teamId);
    if (sockets.length === 0) return;
    this.broadcast.toAll(sockets, JSON.stringify(frame));
  }

  private send(client: WebSocket, frame: ServerPresenceMessage): void {
    this.broadcast.toAll([client], JSON.stringify(frame));
  }

  private reportCount(): void {
    this.metrics?.setSubscribers('presence', this.peers.size);
  }
}

/** Project a peer's last-known state into the wire `PresencePeer` shape. */
function toPeer(st: PeerState): PresencePeer {
  return {
    peerId: st.peerId,
    name: st.name,
    variant: st.variant,
    tint: st.tint,
    x: st.x,
    y: st.y,
    facing: st.facing,
    scene: st.scene,
  };
}

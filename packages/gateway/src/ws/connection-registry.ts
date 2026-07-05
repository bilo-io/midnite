import { Injectable } from '@nestjs/common';
import type { WebSocket } from 'ws';

export interface WsUserContext {
  userId: string | null;
  teamId: string | null;
}

/**
 * In-memory map of active WS connections, keyed by teamId and userId.
 * Maintained by each gateway on connect/disconnect; read by WsBroadcast
 * to target scoped event delivery (Phase 35 D1–D2).
 *
 * null teamId / userId = legacy or static-token client; receives all events
 * via the toAll path so single-user deployments are unaffected.
 */
@Injectable()
export class ConnectionRegistry {
  private readonly meta = new WeakMap<WebSocket, WsUserContext>();
  private readonly byTeam = new Map<string, Set<WebSocket>>();
  private readonly byUser = new Map<string, Set<WebSocket>>();
  // Every live socket, regardless of team/user context (null-context clients
  // aren't in byTeam/byUser) — the heartbeat sweep (Phase 56 C) needs them all.
  private readonly everySocket = new Set<WebSocket>();

  register(client: WebSocket, ctx: WsUserContext): void {
    this.meta.set(client, ctx);
    this.everySocket.add(client);
    if (ctx.teamId) {
      let set = this.byTeam.get(ctx.teamId);
      if (!set) { set = new Set(); this.byTeam.set(ctx.teamId, set); }
      set.add(client);
    }
    if (ctx.userId) {
      let set = this.byUser.get(ctx.userId);
      if (!set) { set = new Set(); this.byUser.set(ctx.userId, set); }
      set.add(client);
    }
  }

  deregister(client: WebSocket): void {
    this.everySocket.delete(client);
    const ctx = this.meta.get(client);
    if (!ctx) return;
    this.meta.delete(client);
    if (ctx.teamId) this.byTeam.get(ctx.teamId)?.delete(client);
    if (ctx.userId) this.byUser.get(ctx.userId)?.delete(client);
  }

  /** Every live socket (Phase 56 C heartbeat sweep). */
  getAll(): Set<WebSocket> {
    return this.everySocket;
  }

  /** Live connection count. */
  size(): number {
    return this.everySocket.size;
  }

  getByTeam(teamId: string): Set<WebSocket> {
    return this.byTeam.get(teamId) ?? new Set();
  }

  getByUser(userId: string): Set<WebSocket> {
    return this.byUser.get(userId) ?? new Set();
  }

  getContext(client: WebSocket): WsUserContext | undefined {
    return this.meta.get(client);
  }
}

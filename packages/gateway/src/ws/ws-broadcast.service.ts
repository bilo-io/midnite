import { Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';
import { ConnectionRegistry } from './connection-registry';

/**
 * Scoped WS broadcast helpers (Phase 35 D2).
 *
 * - toTeam: send to all sockets belonging to a teamId (team-scoped entities).
 * - toUser: send to all sockets for a specific userId.
 * - toAll: broadcast to every connected socket (retained for system events,
 *          pool counts, and legacy tasks whose teamId is null).
 *
 * Sockets that are CLOSING or CLOSED are skipped silently.
 */
@Injectable()
export class WsBroadcastService {
  constructor(private readonly registry: ConnectionRegistry) {}

  toTeam(teamId: string, payload: string): void {
    for (const ws of this.registry.getByTeam(teamId)) {
      this.trySend(ws, payload);
    }
  }

  toUser(userId: string, payload: string): void {
    for (const ws of this.registry.getByUser(userId)) {
      this.trySend(ws, payload);
    }
  }

  toAll(sockets: Iterable<WebSocket>, payload: string): void {
    for (const ws of sockets) {
      this.trySend(ws, payload);
    }
  }

  private trySend(ws: WebSocket, payload: string): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';
import type {
  MidniteConfig,
  ResyncRequiredMessage,
  SequencedEnvelope,
  WatermarkMessage,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { WsBroadcastService } from './ws-broadcast.service';

/** One retained event in a channel's ring. */
type RingEntry = { seq: number; ts: number; payload: string };

/** Outcome of a resume against one channel line (Phase 56 B). */
type ResumeResult = {
  /** Ring events with `seq > lastSeq`, in order — the frames to replay. */
  events: RingEntry[];
  /** The gap exceeds the buffer (or seq reset) → the client must full-refetch. */
  resyncRequired: boolean;
};

/** Client → gateway subscribe/resume message (channel-agnostic core). */
type SubscribeMessage = { type: 'subscribe' | 'resume'; cursor?: Record<string, number> };

/**
 * Phase 56 A — reliable broadcast: wraps {@link WsBroadcastService} to give every
 * board event a **monotonic per-scoped-channel `seq`** and keep a **bounded ring**
 * of the recent events, so a briefly disconnected client can resume without
 * silently missing anything (the resume protocol itself lands in Theme B).
 *
 * Publishers are unchanged — the gateways route their existing `toTeam`/`toAll`
 * sends through here instead of straight to `WsBroadcastService`; this layer
 * stamps + rings on the way out and delegates the actual socket write.
 *
 * Keyed by a caller-supplied **ring key** that encodes channel + scope
 * (`tasks:team:<id>`, `tasks:all`, `ideas:team:<id>`, `workflows:run:<id>`), so
 * each team/run has an independent seq line and buffer. State is in-memory: a
 * gateway restart resets it (correct — clients full-resync on reconnect).
 */
@Injectable()
export class ReliableBroadcastService {
  private readonly seqByKey = new Map<string, number>();
  private readonly ringByKey = new Map<string, RingEntry[]>();
  private ringSize: number;

  constructor(
    @Inject(WsBroadcastService) private readonly ws: WsBroadcastService,
    @Inject(MIDNITE_CONFIG) config: MidniteConfig,
  ) {
    this.ringSize = config.ws.ringSize;
  }

  /** Current retained-events-per-channel size (runtime-adjustable). */
  getRingSize(): number {
    return this.ringSize;
  }

  /** Retune the ring live (Settings). Existing rings are trimmed to the new size. */
  setRingSize(size: number): void {
    this.ringSize = size;
    for (const ring of this.ringByKey.values()) {
      if (ring.length > size) ring.splice(0, ring.length - size);
    }
  }

  /** Stamp + ring + team-scoped send. Returns the allocated seq. */
  toTeam(ringKey: string, teamId: string, event: unknown): number {
    const { seq, payload } = this.stamp(ringKey, event);
    this.ws.toTeam(teamId, payload);
    return seq;
  }

  /** Stamp + ring + broadcast to an explicit socket set (all-subscribers / per-run). */
  toAll(ringKey: string, sockets: Iterable<WebSocket>, event: unknown): number {
    const { seq, payload } = this.stamp(ringKey, event);
    this.ws.toAll(sockets, payload);
    return seq;
  }

  /** The events in a channel's ring after `afterSeq` (for Theme B resume). */
  since(ringKey: string, afterSeq: number): RingEntry[] {
    const ring = this.ringByKey.get(ringKey) ?? [];
    return ring.filter((e) => e.seq > afterSeq);
  }

  /** The newest seq allocated on a channel (the resume watermark, Theme B). */
  watermark(ringKey: string): number {
    return this.seqByKey.get(ringKey) ?? 0;
  }

  /**
   * Phase 56 B — resolve a client's resume against one channel line. The ring
   * retains seqs `[oldest .. watermark]`; the client is at `lastSeq`:
   *  - `lastSeq === watermark` → already current, nothing to send.
   *  - `lastSeq > watermark` → client is ahead of us, i.e. the gateway restarted
   *    and seq reset → resync (its cursor is meaningless now).
   *  - the next needed seq (`lastSeq + 1`) is older than the oldest retained →
   *    the gap exceeds the buffer → resync.
   *  - otherwise → replay the retained events after `lastSeq`.
   */
  resume(ringKey: string, lastSeq: number): ResumeResult {
    const watermark = this.watermark(ringKey);
    if (lastSeq === watermark) return { events: [], resyncRequired: false };
    if (lastSeq > watermark) return { events: [], resyncRequired: true };
    const ring = this.ringByKey.get(ringKey) ?? [];
    const oldest = ring.length > 0 ? ring[0]!.seq : watermark + 1;
    if (lastSeq + 1 < oldest) return { events: [], resyncRequired: true };
    return { events: ring.filter((e) => e.seq > lastSeq), resyncRequired: false };
  }

  /**
   * Phase 56 B — handle a client's subscribe/resume on one socket against the
   * set of ring lines it's entitled to (`allowedKeys`; the gateway derives them
   * from the socket's team/run scope, so a client can't replay another scope).
   *
   *  - **subscribe** (fresh): send a {@link WatermarkMessage} anchoring the
   *    client's cursor to the current per-line watermark — it just did a REST
   *    fetch, so it wants live-from-now, not a full ring replay.
   *  - **resume**: per line, replay the retained events after the client's
   *    cursor, or send a {@link ResyncRequiredMessage} when the gap is too big.
   *
   * The caller adds the socket to its live subscriber set **before** calling
   * this, so a live event during replay is delivered too — the client dedups by
   * `(ch, seq)`, making replay + live overlap idempotent.
   */
  handleSubscription(socket: WebSocket, allowedKeys: string[], msg: SubscribeMessage): void {
    if (msg.type === 'subscribe') {
      const cursor: Record<string, number> = {};
      for (const key of allowedKeys) cursor[key] = this.watermark(key);
      this.sendOne(socket, { type: 'watermark', cursor } satisfies WatermarkMessage);
      return;
    }
    for (const key of allowedKeys) {
      const { events, resyncRequired } = this.resume(key, msg.cursor?.[key] ?? 0);
      if (resyncRequired) {
        this.sendOne(socket, { type: 'resync-required', ch: key } satisfies ResyncRequiredMessage);
        continue;
      }
      for (const entry of events) this.sendRaw(socket, entry.payload);
    }
  }

  /** Send a control frame to one socket (best-effort — ignore a closing socket). */
  private sendOne(socket: WebSocket, message: WatermarkMessage | ResyncRequiredMessage): void {
    this.sendRaw(socket, JSON.stringify(message));
  }

  private sendRaw(socket: WebSocket, payload: string): void {
    if (socket.readyState !== WebSocket.OPEN) return;
    try {
      socket.send(payload);
    } catch {
      // socket closing between the readyState check and the write — drop it.
    }
  }

  private stamp(ringKey: string, event: unknown): { seq: number; payload: string } {
    const seq = (this.seqByKey.get(ringKey) ?? 0) + 1;
    this.seqByKey.set(ringKey, seq);
    const ts = Date.now();
    // `ch` lets a client that multiplexes >1 seq line on one socket (the tasks
    // socket carries a team line + an all line) track lastSeq per line.
    const envelope: SequencedEnvelope<unknown> = { seq, ts, ch: ringKey, event };
    const payload = JSON.stringify(envelope);

    const ring = this.ringByKey.get(ringKey) ?? [];
    ring.push({ seq, ts, payload });
    if (ring.length > this.ringSize) ring.splice(0, ring.length - this.ringSize);
    this.ringByKey.set(ringKey, ring);

    return { seq, payload };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';
import type { MidniteConfig, SequencedEnvelope } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { WsBroadcastService } from './ws-broadcast.service';

/** One retained event in a channel's ring. */
type RingEntry = { seq: number; ts: number; payload: string };

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

  private stamp(ringKey: string, event: unknown): { seq: number; payload: string } {
    const seq = (this.seqByKey.get(ringKey) ?? 0) + 1;
    this.seqByKey.set(ringKey, seq);
    const ts = Date.now();
    const envelope: SequencedEnvelope<unknown> = { seq, ts, event };
    const payload = JSON.stringify(envelope);

    const ring = this.ringByKey.get(ringKey) ?? [];
    ring.push({ seq, ts, payload });
    if (ring.length > this.ringSize) ring.splice(0, ring.length - this.ringSize);
    this.ringByKey.set(ringKey, ring);

    return { seq, payload };
  }
}

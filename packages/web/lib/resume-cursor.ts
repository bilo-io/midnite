import {
  ResyncRequiredMessageSchema,
  WatermarkMessageSchema,
  type SubscribeOrResume,
} from '@midnite/shared';

/**
 * Phase 56 B — client resume/dedup, shared by every board WS hook (tasks, ideas,
 * workflows). Pure + framework-agnostic (no WS/DOM), so it unit-tests directly.
 *
 * A single socket can multiplex more than one independent seq line (the tasks
 * socket carries a team line + an all-scoped activity line), each tagged with a
 * `ch` on the envelope. This tracks a `lastSeq` **per `ch`** so that:
 *  - on (re)connect the hook sends the right {@link SubscribeOrResume} frame —
 *    `subscribe` when fresh, `resume` with the per-`ch` cursor after a drop;
 *  - replay + live overlap is idempotent — an event whose `seq` was already
 *    applied on its `ch` is dropped as a duplicate;
 *  - a `resync-required` control frame surfaces so the hook can full-refetch.
 */
export type ResumeDecision<E> =
  /** Apply this event (first time seen on its channel). */
  | { kind: 'event'; ch: string; event: E }
  /** A fresh-subscribe watermark anchored the cursor; nothing else to do. */
  | { kind: 'watermark' }
  /** The gap was too big to replay — the hook must full-refetch (`ch` if scoped). */
  | { kind: 'resync'; ch?: string }
  /** Already applied on its channel — drop it. */
  | { kind: 'duplicate' }
  /** Not a frame we recognise (or unparseable) — ignore. */
  | { kind: 'ignore' };

export class ResumeTracker<E> {
  private readonly cursor = new Map<string, number>();

  /** `parseEvent` unwraps a raw sequenced envelope, or returns null if it isn't one. */
  constructor(
    private readonly parseEvent: (raw: unknown) => { seq: number; ch?: string; event: E } | null,
  ) {}

  /** The subscribe/resume frame to send on (re)connect (merge in channel `extra`, e.g. `runId`). */
  subscribeMessage(extra?: Record<string, unknown>): SubscribeOrResume & Record<string, unknown> {
    if (this.cursor.size === 0) return { type: 'subscribe', ...extra };
    return { type: 'resume', cursor: Object.fromEntries(this.cursor), ...extra };
  }

  /**
   * Classify an incoming raw WS message and advance the cursor. `raw` may be a
   * JSON string (the shared subscription hook) or an already-parsed object (the
   * workflow hook / unit tests) — control frames are matched against the parsed
   * form, while `parseEvent` receives the original `raw` (channel decoders parse
   * their own wire shape).
   */
  accept(raw: unknown): ResumeDecision<E> {
    let obj: unknown = raw;
    if (typeof raw === 'string') {
      try {
        obj = JSON.parse(raw);
      } catch {
        return { kind: 'ignore' };
      }
    }

    const watermark = WatermarkMessageSchema.safeParse(obj);
    if (watermark.success) {
      for (const [ch, seq] of Object.entries(watermark.data.cursor)) this.cursor.set(ch, seq);
      return { kind: 'watermark' };
    }

    const resync = ResyncRequiredMessageSchema.safeParse(obj);
    if (resync.success) {
      // Re-anchor the gapped line to 0 so future live events re-establish it (a
      // gateway restart resets seq, so the old high-water mark is meaningless).
      if (resync.data.ch) this.cursor.set(resync.data.ch, 0);
      else this.cursor.clear();
      return { kind: 'resync', ch: resync.data.ch };
    }

    const parsed = this.parseEvent(raw);
    if (!parsed) return { kind: 'ignore' };
    const ch = parsed.ch ?? '';
    if (parsed.seq <= (this.cursor.get(ch) ?? 0)) return { kind: 'duplicate' };
    this.cursor.set(ch, parsed.seq);
    return { kind: 'event', ch, event: parsed.event };
  }
}

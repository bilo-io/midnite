import { z } from 'zod';

/**
 * Phase 56 A — the sequenced envelope every board event travels in.
 *
 * The gateway stamps each outgoing board event with a **monotonic per-channel
 * `seq`** (so a client can detect a gap and resume — Theme B) and a **`ts`**
 * (ms epoch, for ordering). The existing discriminated event union rides
 * untouched under `event`, so the per-feature schemas (`TaskBoardEvent`,
 * `IdeaEvent`, `WorkflowEvent`) don't change — they're just wrapped.
 *
 * Phase 56 B adds **`ch`** — the ring-channel/line key this `seq` belongs to
 * (e.g. `tasks:team:<id>`, `tasks:all`, `workflows:run:<id>`). A single socket
 * can multiplex more than one independent seq line (the tasks socket carries a
 * team-scoped line **and** an all-scoped activity line), so the client tracks a
 * `lastSeq` **per `ch`** and echoes them back as a resume cursor. Optional so a
 * pre-B gateway (or a non-rung frame) still validates.
 *
 * `sequencedEnvelope(schema)` builds the concrete wrapper for a given event
 * union; see `SequencedTaskBoardEventSchema` et al. next to each union.
 */
export function sequencedEnvelope<T extends z.ZodTypeAny>(event: T) {
  return z.object({
    /** Monotonic, per-scoped-channel. Starts at 1; resets when the gateway restarts. */
    seq: z.number().int().nonnegative(),
    /** ms epoch the gateway stamped the event, for ordering. */
    ts: z.number().int().nonnegative(),
    /** Ring-channel/line key this seq belongs to (Phase 56 B). Optional pre-B. */
    ch: z.string().optional(),
    event,
  });
}

/** The wrapper shape, generic over the carried event union. */
export type SequencedEnvelope<T> = { seq: number; ts: number; ch?: string; event: T };

/**
 * Phase 56 B — the resume protocol control frames + cursor, shared by every
 * board channel (tasks / ideas / workflows). These ride the **same socket** as
 * the sequenced event envelopes; they're discriminated by a `type` value no
 * event union uses, so a client can tell a control frame from an event frame.
 */

/** Client's per-channel high-water marks: ring-channel key → last applied seq. */
export const ResumeCursorSchema = z.record(z.string(), z.number().int().nonnegative());
export type ResumeCursor = z.infer<typeof ResumeCursorSchema>;

/**
 * Server → client, sent once on a **fresh subscribe**: the current seq watermark
 * per channel line on this socket, so the client anchors its cursor to "now"
 * (and won't replay the whole ring — it just did a REST fetch) and applies only
 * strictly-newer live events.
 */
export const WatermarkMessageSchema = z.object({
  type: z.literal('watermark'),
  cursor: ResumeCursorSchema,
});
export type WatermarkMessage = z.infer<typeof WatermarkMessageSchema>;

/**
 * Server → client: the gap between the client's `lastSeq` and the ring's oldest
 * retained event exceeds the buffer (or the gateway restarted and seq reset), so
 * replay can't fill it. The client must **full-refetch** the affected channel
 * rather than apply a drift-prone partial stream. `ch` names the gapped line.
 */
export const ResyncRequiredMessageSchema = z.object({
  type: z.literal('resync-required'),
  ch: z.string().optional(),
});
export type ResyncRequiredMessage = z.infer<typeof ResyncRequiredMessageSchema>;

/**
 * Client → gateway subscribe/resume message (channel-agnostic core). `subscribe`
 * = fresh (anchor to the current watermark); `resume` = reconnect, carrying the
 * client's `cursor` so the gateway replays what it missed. Channels that need
 * extra fields `.extend()` this (e.g. workflows add `runId`).
 */
export const SubscribeOrResumeSchema = z.object({
  type: z.enum(['subscribe', 'resume']),
  cursor: ResumeCursorSchema.optional(),
});
export type SubscribeOrResume = z.infer<typeof SubscribeOrResumeSchema>;

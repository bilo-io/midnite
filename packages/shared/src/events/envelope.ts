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
 * `sequencedEnvelope(schema)` builds the concrete wrapper for a given event
 * union; see `SequencedTaskBoardEventSchema` et al. next to each union.
 */
export function sequencedEnvelope<T extends z.ZodTypeAny>(event: T) {
  return z.object({
    /** Monotonic, per-scoped-channel. Starts at 1; resets when the gateway restarts. */
    seq: z.number().int().nonnegative(),
    /** ms epoch the gateway stamped the event, for ordering. */
    ts: z.number().int().nonnegative(),
    event,
  });
}

/** The wrapper shape, generic over the carried event union. */
export type SequencedEnvelope<T> = { seq: number; ts: number; event: T };

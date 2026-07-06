'use client';

import { IDEAS_WS_PATH, SequencedIdeaEventSchema, type IdeaEvent } from '@midnite/shared';
import { invalidateData } from '@/lib/data-refresh';
import { useReliableSubscription, type ReliableChannel } from './use-reliable-subscription';

// Phase 56 D — the ideas channel over the shared reliable subscription.
const IDEAS_CHANNEL: ReliableChannel<IdeaEvent> = {
  path: IDEAS_WS_PATH,
  subscribe: () => ({ type: 'subscribe' }),
  decode: (raw) => {
    const parsed = SequencedIdeaEventSchema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { seq: parsed.data.seq, ch: parsed.data.ch, event: parsed.data.event }
      : null;
  },
};

/**
 * Subscribe to the gateway's live idea WebSocket (Phase 56 D; Phase 56 B resume).
 * Invalidates the query cache on every idea.created / updated / deleted, and on a
 * too-big gap (resync). Mount once alongside the other live-data hooks.
 */
export function useIdeaEvents(): void {
  useReliableSubscription(IDEAS_CHANNEL, {
    onEvent: () => invalidateData(),
    onResync: () => invalidateData(),
  });
}

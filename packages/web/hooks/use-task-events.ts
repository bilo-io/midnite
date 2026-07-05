'use client';

import { TASKS_WS_PATH, SequencedTaskBoardEventSchema, type TaskBoardEvent } from '@midnite/shared';
import { invalidateData } from '@/lib/data-refresh';
import { emitTaskEvent } from '@/lib/task-events';
import { useReliableSubscription, type ReliableChannel } from './use-reliable-subscription';

// Phase 56 D — the task board channel, consumed via the shared reliable
// subscription. Module-level so its identity is stable across renders.
const TASKS_CHANNEL: ReliableChannel<TaskBoardEvent> = {
  path: TASKS_WS_PATH,
  subscribe: () => ({ type: 'subscribe' }),
  decode: (raw) => {
    const parsed = SequencedTaskBoardEventSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { seq: parsed.data.seq, event: parsed.data.event } : null;
  },
};

/**
 * Subscribe to the gateway's live task-board WebSocket (Phase 56 D — now over the
 * shared reliable subscription). Per-event-type cache strategy lives here (the
 * hook is transport-only): board-state events invalidate; ephemeral agent /
 * guardrail events are handled by their own consumers (office store), so we skip
 * the refetch to avoid a storm on high-frequency tool activity.
 */
export function useTaskEvents(): void {
  useReliableSubscription(TASKS_CHANNEL, {
    onEvent: (event) => {
      const isEphemeral =
        event.type === 'agent.activity' ||
        event.type === 'agent.attention' ||
        event.type === 'guardrails.updated';
      if (!isEphemeral) invalidateData();
      emitTaskEvent(event);
    },
  });
}

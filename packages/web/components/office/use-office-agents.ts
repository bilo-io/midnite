'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { AgentActivityEvent, AgentAttentionEvent } from '@midnite/shared';

import { getSessions, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useOfficeStore } from '@/lib/office-store';
import { sessionsToOfficeAgents } from '@/lib/office/agents';
import { useAgentActivityListener, useAgentAttentionListener } from '@/lib/task-events';

const ACTIVITY_DEBOUNCE_MS = 250;

/**
 * Fetches live sessions + tasks and feeds them into the office store as desk
 * occupants. Uses the same `useApiData` pattern as the Sessions page, so the
 * gateway task-board WebSocket (via <LiveData/> → invalidateData) refetches this
 * automatically — desks update as agents change.
 *
 * Also subscribes to `agent.activity` / `agent.attention` WS events (Phase 31 E)
 * and patches the matching OfficeAgent in the store directly — no full refetch for
 * ephemeral tool signals. Activity updates are debounced (latest-wins,
 * ACTIVITY_DEBOUNCE_MS) so bursts of rapid tool calls coalesce into a single smooth
 * "current action". Attention patches are applied immediately (urgent).
 */
export function useOfficeAgents(): { error: string | null } {
  const { data, error } = useApiData(() => Promise.all([getSessions(), getTasks()]));
  const setAgents = useOfficeStore((s) => s.setAgents);
  const patchAgent = useOfficeStore((s) => s.patchAgent);

  useEffect(() => {
    if (!data) return;
    const [sessions, tasks] = data;
    setAgents(sessionsToOfficeAgents(sessions, tasks));
  }, [data, setAgents]);

  // Per-session debounce timers — kept in a ref to avoid recreating the handler.
  const activityTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const onActivity = useCallback(
    (event: AgentActivityEvent) => {
      const { sessionId, phase, tool, label } = event;
      const timers = activityTimers.current;
      const existing = timers.get(sessionId);
      if (existing) clearTimeout(existing);
      timers.set(
        sessionId,
        setTimeout(() => {
          timers.delete(sessionId);
          patchAgent(sessionId, { liveActivity: { phase, tool, label } });
          // Clear attention when the agent resumes — no longer blocking on the user.
          if (phase === 'running' || phase === 'idle') {
            patchAgent(sessionId, { liveAttention: null });
          }
        }, ACTIVITY_DEBOUNCE_MS),
      );
    },
    [patchAgent],
  );

  const onAttention = useCallback(
    (event: AgentAttentionEvent) => {
      patchAgent(event.sessionId, { liveAttention: { reason: event.reason, summary: event.summary } });
    },
    [patchAgent],
  );

  useAgentActivityListener(onActivity);
  useAgentAttentionListener(onAttention);

  // Cleanup debounce timers on unmount to avoid calling stale closures.
  useEffect(() => {
    const timers = activityTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  return { error };
}

'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { AgentActivityEvent, AgentAttentionEvent } from '@midnite/shared';
import { getPoolSnapshot, getSessions, getTasks } from '@/lib/api';
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
 * Also subscribes to `agent.activity` / `agent.attention` events (Phase 31 A/E)
 * and patches the office store directly — no full refetch for ephemeral tool signals.
 * Activity updates are debounced (latest-wins, ACTIVITY_DEBOUNCE_MS) so a burst of
 * rapid tool calls coalesces into a single smooth "current action".
 */
export function useOfficeAgents(): { error: string | null } {
  const { data, error } = useApiData(() => Promise.all([getSessions(), getTasks()]));
  const setAgents = useOfficeStore((s) => s.setAgents);
  const patchAgent = useOfficeStore((s) => s.patchAgent);
  const setDeskCapacity = useOfficeStore((s) => s.setDeskCapacity);

  // Per-session debounce timers for activity events — kept in a ref so they
  // don't re-create the handler on each render.
  const activityTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!data) return;
    const [sessions, tasks] = data;
    setAgents(sessionsToOfficeAgents(sessions, tasks));
  }, [data, setAgents]);

  // Hot-desk count follows the agent-pool capacity (A3). Config-static, so fetch
  // once; on failure the scene keeps its default desk count.
  useEffect(() => {
    let cancelled = false;
    getPoolSnapshot()
      .then((snapshot) => {
        if (!cancelled) setDeskCapacity(snapshot.capacity);
      })
      .catch(() => {
        /* leave deskCapacity null — the scene falls back to its default */
      });
    return () => {
      cancelled = true;
    };
  }, [setDeskCapacity]);

  // Debounced activity patch: latest-wins within the debounce window.
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
        }, ACTIVITY_DEBOUNCE_MS),
      );
    },
    [patchAgent],
  );

  // Attention is urgent — patch immediately without debounce.
  const onAttention = useCallback(
    (event: AgentAttentionEvent) => {
      patchAgent(event.sessionId, { attention: { reason: event.reason, summary: event.summary } });
    },
    [patchAgent],
  );

  // Clear attention when the agent resumes (phase: 'running' or 'idle').
  const onActivityClearAttention = useCallback(
    (event: AgentActivityEvent) => {
      if (event.phase === 'running' || event.phase === 'idle') {
        patchAgent(event.sessionId, { attention: undefined });
      }
    },
    [patchAgent],
  );

  useAgentActivityListener(onActivity);
  useAgentActivityListener(onActivityClearAttention);
  useAgentAttentionListener(onAttention);

  // Cleanup debounce timers on unmount.
  useEffect(() => {
    const timers = activityTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  return { error };
}

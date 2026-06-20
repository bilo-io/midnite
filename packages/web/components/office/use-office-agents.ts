'use client';

import { useEffect } from 'react';
import { getSessions, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useOfficeStore } from '@/lib/office-store';
import { sessionsToOfficeAgents } from '@/lib/office/agents';

/**
 * Fetches live sessions + tasks and feeds them into the office store as desk
 * occupants. Uses the same `useApiData` pattern as the Sessions page, so the
 * gateway task-board WebSocket (via <LiveData/> → invalidateData) refetches this
 * automatically — desks update as agents change. Returns the fetch error for the
 * caller to surface via the gateway error toast.
 */
export function useOfficeAgents(): { error: string | null } {
  const { data, error } = useApiData(() => Promise.all([getSessions(), getTasks()]));
  const setAgents = useOfficeStore((s) => s.setAgents);

  useEffect(() => {
    if (!data) return;
    const [sessions, tasks] = data;
    setAgents(sessionsToOfficeAgents(sessions, tasks));
  }, [data, setAgents]);

  return { error };
}

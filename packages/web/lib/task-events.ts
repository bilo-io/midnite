'use client';

import { useEffect } from 'react';
import type {
  AgentActivityEvent,
  AgentAttentionEvent,
  GuardrailsUpdatedEvent,
  TaskBoardEvent,
} from '@midnite/shared';

/**
 * Client-side fan-out for parsed task-board events. The single live WS hook
 * ({@link useTaskEvents}) feeds events in here; interested consumers (e.g.
 * desktop notifications, the office store) subscribe — so we keep one socket,
 * not one per feature.
 */
const listeners = new Set<(event: TaskBoardEvent) => void>();

export function emitTaskEvent(event: TaskBoardEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // a broken consumer must not break the others
    }
  }
}

/** Subscribe to task events for the component's lifetime. `handler` must be stable. */
export function useTaskEventListener(handler: (event: TaskBoardEvent) => void): void {
  useEffect(() => {
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, [handler]);
}

/**
 * Subscribe to `agent.activity` events for the component's lifetime.
 * These are ephemeral tool-call signals — they don't trigger a board refetch.
 * `handler` must be stable (wrap in useCallback if needed).
 */
export function useAgentActivityListener(handler: (event: AgentActivityEvent) => void): void {
  useEffect(() => {
    const listener = (event: TaskBoardEvent): void => {
      if (event.type === 'agent.activity') handler(event);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [handler]);
}

/**
 * Subscribe to `agent.attention` events for the component's lifetime.
 * These fire when an agent blocks on the user (approval or notification).
 * `handler` must be stable.
 */
export function useAgentAttentionListener(handler: (event: AgentAttentionEvent) => void): void {
  useEffect(() => {
    const listener = (event: TaskBoardEvent): void => {
      if (event.type === 'agent.attention') handler(event);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [handler]);
}

/**
 * Subscribe to `guardrails.updated` events (Phase 50 A) — the kill-switch/pause
 * state changed. `handler` must be stable.
 */
export function useGuardrailsListener(handler: (event: GuardrailsUpdatedEvent) => void): void {
  useEffect(() => {
    const listener = (event: TaskBoardEvent): void => {
      if (event.type === 'guardrails.updated') handler(event);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [handler]);
}

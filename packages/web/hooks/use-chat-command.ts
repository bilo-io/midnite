'use client';

import { useCallback, useRef, useState } from 'react';
import type { ChatCommandResult, ChatPreviewResponse } from '@midnite/shared';

import { previewChatCommand, runChatCommand, undoChatCommand } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { expandFollowup } from '@/lib/chat-followup';

/**
 * Phase 59 E — the chat command bar's state machine. One-shot with light
 * last-result context (Theme E) over the Theme B/D/F backend:
 *
 * submit → **preview** (parse + describe + cost). A mutating intent parks in
 * `confirm` (the Theme F seatbelt); `confirm()` executes with `confirm: true`.
 * Read-only queries run immediately. A follow-up ("make **those** p1") expands
 * client-side to one command per previously-affected id ({@link expandFollowup}).
 * `undo()` reverts the last command(s) via their undo tokens. Board views refresh
 * through the global `invalidateData()` (same path the composer uses).
 */
export type ChatPhase = 'idle' | 'confirm' | 'running' | 'done' | 'error';

export type ChatCommandState = {
  phase: ChatPhase;
  preview: ChatPreviewResponse | null;
  result: ChatCommandResult | null;
  /** How many concrete commands the submission expands to (>1 for a follow-up). */
  affectedCount: number;
  error: string | null;
  busy: boolean;
  canUndo: boolean;
  submit: (text: string) => void;
  confirm: () => void;
  cancel: () => void;
  undo: () => void;
  reset: () => void;
};

export function useChatCommand(): ChatCommandState {
  const [phase, setPhase] = useState<ChatPhase>('idle');
  const [preview, setPreview] = useState<ChatPreviewResponse | null>(null);
  const [result, setResult] = useState<ChatCommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The concrete command(s) the current submission will run (1, or N for a follow-up).
  const pendingRef = useRef<string[]>([]);
  // Carried across submissions: the last result's affected ids (follow-up context)
  // and its undo token(s).
  const lastAffectedRef = useRef<string[]>([]);
  const undoTokensRef = useRef<string[]>([]);

  const fail = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : 'Something went wrong.');
    setPhase('error');
  }, []);

  // Execute the pending command(s), aggregating the outcome. Mutating commands
  // pass confirm=true (post-gate); a read-only run passes false (nothing to gate).
  const execute = useCallback(async (confirmFlag: boolean) => {
    setPhase('running');
    try {
      const results: ChatCommandResult[] = [];
      for (const text of pendingRef.current) {
        const res = await runChatCommand(text, confirmFlag);
        results.push(res.result);
      }
      const affected = [...new Set(results.flatMap((r) => r.affectedIds))];
      const tokens = results.flatMap((r) => (r.undoToken ? [r.undoToken] : []));
      lastAffectedRef.current = affected;
      undoTokensRef.current = tokens;
      setResult(aggregate(results, affected));
      setPhase('done');
      if (affected.length > 0) invalidateData();
    } catch (err) {
      fail(err);
    }
  }, [fail]);

  const submit = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      setError(null);
      setResult(null);
      const expanded = expandFollowup(text, lastAffectedRef.current);
      pendingRef.current = expanded ?? [text];
      setPhase('running');
      // Preview the first concrete command to describe + get the confirm level.
      previewChatCommand(pendingRef.current[0]!)
        .then((pv) => {
          setPreview(pv);
          if (pv.confirmation === 'confirm') {
            setPhase('confirm'); // park — wait for confirm()
          } else {
            void execute(false); // read-only → run immediately, nothing to gate
          }
        })
        .catch(fail);
    },
    [execute, fail],
  );

  const confirm = useCallback(() => {
    if (phase === 'confirm') void execute(true);
  }, [phase, execute]);

  const cancel = useCallback(() => {
    pendingRef.current = [];
    setPreview(null);
    setPhase('idle');
  }, []);

  const undo = useCallback(() => {
    const tokens = undoTokensRef.current;
    if (tokens.length === 0) return;
    setPhase('running');
    // Revert in reverse order; the last reverted summary is shown.
    (async () => {
      try {
        let last: ChatCommandResult | null = null;
        for (const token of [...tokens].reverse()) {
          const res = await undoChatCommand(token);
          last = res.result;
        }
        undoTokensRef.current = [];
        lastAffectedRef.current = [];
        setResult(last);
        setPhase('done');
        invalidateData();
      } catch (err) {
        fail(err);
      }
    })();
  }, [fail]);

  const reset = useCallback(() => {
    // Keep lastAffected/undo context for a follow-up; just clear the transient view.
    pendingRef.current = [];
    setPreview(null);
    setResult(null);
    setError(null);
    setPhase('idle');
  }, []);

  return {
    phase,
    preview,
    result,
    affectedCount: pendingRef.current.length,
    error,
    busy: phase === 'running',
    canUndo: phase === 'done' && undoTokensRef.current.length > 0,
    submit,
    confirm,
    cancel,
    undo,
    reset,
  };
}

/** Collapse N per-id results into one displayed result. */
function aggregate(results: ChatCommandResult[], affected: string[]): ChatCommandResult {
  if (results.length === 1) return results[0]!;
  const done = results.length;
  return {
    summary: `Applied to ${done} task${done === 1 ? '' : 's'}.`,
    affectedIds: affected,
    inferencePath: results[0]?.inferencePath ?? 'deterministic',
    confirmation: 'none',
  };
}

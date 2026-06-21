'use client';

import { useEffect, useRef } from 'react';
import type { StoreApi } from 'zustand';
import type { WorkflowState } from './workflow-store';

/** Quiet interval after the last edit before the editor autosaves. */
export const AUTOSAVE_DELAY_MS = 1500;

/**
 * Debounced autosave for the workflow editor. Subscribes to the store and, a
 * quiet interval after a dirty edit, invokes `save()` — so edits persist without
 * the user reaching for the Save button. Skips while `paused()` is true (a save
 * already in flight, or a run active — `run()` saves first); the `dirty` flag
 * persists, so the next edit reschedules. Manual Save still works alongside it.
 *
 * `save` and `paused` are read through refs, so the latest closures are used
 * without re-subscribing on every render. Selection-only changes never trigger
 * a save — only edits to a content field do.
 */
export function useAutosave(
  store: StoreApi<WorkflowState>,
  save: () => void,
  paused: () => boolean,
  delayMs: number = AUTOSAVE_DELAY_MS,
): void {
  const saveRef = useRef(save);
  saveRef.current = save;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    };
    const unsubscribe = store.subscribe((state, prev) => {
      if (!state.dirty) return;
      const edited =
        !prev.dirty ||
        state.nodes !== prev.nodes ||
        state.edges !== prev.edges ||
        state.name !== prev.name ||
        state.enabled !== prev.enabled ||
        state.trigger !== prev.trigger;
      if (!edited) return;
      clear();
      timer = setTimeout(() => {
        timer = undefined;
        if (store.getState().dirty && !pausedRef.current()) saveRef.current();
      }, delayMs);
    });
    return () => {
      clear();
      unsubscribe();
    };
  }, [store, delayMs]);
}

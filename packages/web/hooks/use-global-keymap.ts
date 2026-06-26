'use client';

import { useEffect, useRef } from 'react';

/** Returns true when focus is inside an editable element (input/textarea/CE). */
function inEditableElement(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = (el as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return (el as HTMLElement).contentEditable === 'true';
}

export type GlobalKeymapHandlers = {
  /** ⌘K / Ctrl+K — open command palette. */
  openPalette?: () => void;
  /** `?` — open keyboard shortcuts help overlay. */
  openHelp?: () => void;
  /** `N` — open new-task form. */
  newTask?: () => void;
  /** `G B` — go to Board. */
  goBoard?: () => void;
  /** `G O` — go to Office. */
  goOffice?: () => void;
  /** `G S` — go to Settings. */
  goSettings?: () => void;
  /** `G H` — go to Home. */
  goHome?: () => void;
};

/**
 * Binds global keyboard shortcuts. Suppresses all shortcuts when an editable
 * element has focus. Two-key `G …` chord sequences wait up to 400 ms for the
 * second key before resetting.
 *
 * Mount this hook once in the root layout via a thin client component.
 */
export function useGlobalKeymap(handlers: GlobalKeymapHandlers) {
  // Stable ref so the effect doesn't re-subscribe on every render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let chordPending: string | null = null;
    let chordTimer: ReturnType<typeof setTimeout> | null = null;

    const clearChord = () => {
      chordPending = null;
      if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }
    };

    const onKey = (e: KeyboardEvent) => {
      const h = handlersRef.current;

      // ⌘K / Ctrl+K always fires, even inside inputs (matches browser search UX).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        clearChord();
        h.openPalette?.();
        return;
      }

      // All other shortcuts suppressed inside editable elements.
      if (inEditableElement()) { clearChord(); return; }

      // Resolve a pending G-chord.
      if (chordPending === 'g') {
        clearChord();
        switch (e.key.toLowerCase()) {
          case 'b': h.goBoard?.(); break;
          case 'o': h.goOffice?.(); break;
          case 's': h.goSettings?.(); break;
          case 'h': h.goHome?.(); break;
        }
        return;
      }

      // Single-key chords (no meta/ctrl/alt modifier).
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case '?':
          e.preventDefault();
          h.openHelp?.();
          break;
        case 'n':
        case 'N':
          h.newTask?.();
          break;
        case 'g':
        case 'G':
          // Start a chord — wait for second key.
          chordPending = 'g';
          chordTimer = setTimeout(clearChord, 400);
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearChord(); };
  }, []);
}

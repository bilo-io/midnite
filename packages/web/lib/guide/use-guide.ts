'use client';

import { create } from 'zustand';

import type { Guide } from './steps';

/**
 * Client-only state for the running product guide (Phase 66 Theme F). A global
 * store (not context) so the assistant panel — rendered in a portal, mounted
 * separately from the `<GuideOverlay/>` that draws the spotlight — can start a
 * guide the overlay then renders. Zustand per the CLAUDE.md "genuinely
 * client-only UI state" rule.
 *
 * `unavailable` is the transient "no guide for this page yet" notice, shown when
 * the panel asks to start a guide for a route that has none.
 */
interface GuideState {
  /** The guide being shown, or null when idle. */
  active: Guide | null;
  /** Index into `active.steps`. */
  stepIndex: number;
  /** True briefly after starting on a route with no guide (drives the notice). */
  unavailable: boolean;
  /** Start a guide (or flag unavailable when `guide` is null). */
  start: (guide: Guide | null) => void;
  next: () => void;
  prev: () => void;
  /** End the guide / dismiss the notice. */
  stop: () => void;
}

export const useGuide = create<GuideState>((set, get) => ({
  active: null,
  stepIndex: 0,
  unavailable: false,
  start: (guide) => {
    if (!guide || guide.steps.length === 0) {
      set({ active: null, stepIndex: 0, unavailable: true });
      return;
    }
    set({ active: guide, stepIndex: 0, unavailable: false });
  },
  next: () => {
    const { active, stepIndex } = get();
    if (!active) return;
    if (stepIndex >= active.steps.length - 1) {
      set({ active: null, stepIndex: 0 });
      return;
    }
    set({ stepIndex: stepIndex + 1 });
  },
  prev: () => {
    const { stepIndex } = get();
    set({ stepIndex: Math.max(0, stepIndex - 1) });
  },
  stop: () => set({ active: null, stepIndex: 0, unavailable: false }),
}));

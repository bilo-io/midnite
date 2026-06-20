'use client';

import { create } from 'zustand';
import type { OfficeAgent } from '@/lib/office/agents';

/** Which view the interaction panel is showing for the selected desk. */
export type InteractionMode = 'menu' | 'call' | 'message';

/**
 * Bridges live data, the Phaser scene, and the React HUD. A React hook
 * (`use-office-agents`) pushes live gateway sessions in via `setAgents`; the
 * scene writes transient state (which desk the player is near, which one they
 * opened) via the vanilla store API — `useOfficeStore.getState()` /
 * `.subscribe()` — and the HUD reads it through the hook. A single global store
 * (not a context) is what lets the non-React scene reach it.
 */
interface OfficeState {
  /** Live desk occupants, in desk-assignment order. */
  agents: OfficeAgent[];
  /** Desk/agent id the player is standing next to, or null. */
  nearbyId: string | null;
  /** The desk the player opened, plus which panel view is showing. */
  active: { id: string; mode: InteractionMode } | null;
  setAgents(agents: OfficeAgent[]): void;
  setNearby(id: string | null): void;
  open(id: string): void;
  setMode(mode: InteractionMode): void;
  close(): void;
  /** Clear transient UI state — called when the scene tears down. */
  reset(): void;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  agents: [],
  nearbyId: null,
  active: null,
  setAgents: (agents) => set({ agents }),
  // Skip the update when unchanged — `update()` calls this every frame.
  setNearby: (id) => set((s) => (s.nearbyId === id ? s : { nearbyId: id })),
  open: (id) => set({ active: { id, mode: 'menu' } }),
  setMode: (mode) => set((s) => (s.active ? { active: { ...s.active, mode } } : s)),
  close: () => set({ active: null }),
  reset: () => set({ nearbyId: null, active: null }),
}));

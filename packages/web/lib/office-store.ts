'use client';

import { create } from 'zustand';
import type { OfficeAgent } from '@/lib/office/agents';

/** Which view the interaction panel is showing for the selected desk. */
export type InteractionMode = 'menu' | 'call' | 'message';

/**
 * Bridges live data, the Phaser scene, and the React HUD. A React hook
 * (`use-office-agents`) pushes live gateway sessions in via `setAgents`; the
 * scene writes transient state (which desk the player is near, which one they
 * opened, whether they're at the board room) via the vanilla store API —
 * `useOfficeStore.getState()` / `.subscribe()` — and the HUD reads it through the
 * hook. A single global store (not a context) is what lets the non-React scene
 * reach it.
 */
interface OfficeState {
  /** Live desk/lounge occupants, in assignment order. */
  agents: OfficeAgent[];
  /** Desk/agent id the player is standing next to (working agents only), or null. */
  nearbyId: string | null;
  /** Whether the player is standing at the board room's documents board. */
  nearBoard: boolean;
  /** The desk the player opened, plus which panel view is showing. */
  active: { id: string; mode: InteractionMode } | null;
  /** Whether the board room document panel is open. */
  boardOpen: boolean;
  setAgents(agents: OfficeAgent[]): void;
  setNearby(id: string | null): void;
  setNearBoard(near: boolean): void;
  open(id: string): void;
  setMode(mode: InteractionMode): void;
  close(): void;
  openBoard(): void;
  closeBoard(): void;
  /** Clear transient UI state — called when the scene tears down. */
  reset(): void;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  agents: [],
  nearbyId: null,
  nearBoard: false,
  active: null,
  boardOpen: false,
  setAgents: (agents) => set({ agents }),
  // Skip the update when unchanged — `update()` calls these every frame.
  setNearby: (id) => set((s) => (s.nearbyId === id ? s : { nearbyId: id })),
  setNearBoard: (near) => set((s) => (s.nearBoard === near ? s : { nearBoard: near })),
  open: (id) => set({ active: { id, mode: 'menu' }, boardOpen: false }),
  setMode: (mode) => set((s) => (s.active ? { active: { ...s.active, mode } } : s)),
  close: () => set({ active: null }),
  openBoard: () => set({ boardOpen: true, active: null }),
  closeBoard: () => set({ boardOpen: false }),
  reset: () => set({ nearbyId: null, nearBoard: false, active: null, boardOpen: false }),
}));

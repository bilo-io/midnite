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
  /** Whether the player is standing at the kitchen's coffee machine. */
  nearKitchen: boolean;
  /** Whether the player is standing at the library bookshelf. */
  nearLibrary: boolean;
  /** The desk the player opened, plus which panel view is showing. */
  active: { id: string; mode: InteractionMode } | null;
  /** Whether the board room document panel is open. */
  boardOpen: boolean;
  /** Whether the library modal is open. */
  libraryOpen: boolean;
  /** Personal "on a coffee break" presence flag (mock — local to this session). */
  onBreak: boolean;
  setAgents(agents: OfficeAgent[]): void;
  setNearby(id: string | null): void;
  setNearBoard(near: boolean): void;
  setNearKitchen(near: boolean): void;
  setNearLibrary(near: boolean): void;
  open(id: string): void;
  setMode(mode: InteractionMode): void;
  close(): void;
  openBoard(): void;
  closeBoard(): void;
  openLibrary(): void;
  closeLibrary(): void;
  toggleBreak(): void;
  /** Clear transient UI state — called when the scene tears down. */
  reset(): void;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  agents: [],
  nearbyId: null,
  nearBoard: false,
  nearKitchen: false,
  nearLibrary: false,
  active: null,
  boardOpen: false,
  libraryOpen: false,
  onBreak: false,
  setAgents: (agents) => set({ agents }),
  // Skip the update when unchanged — `update()` calls these every frame.
  setNearby: (id) => set((s) => (s.nearbyId === id ? s : { nearbyId: id })),
  setNearBoard: (near) => set((s) => (s.nearBoard === near ? s : { nearBoard: near })),
  setNearKitchen: (near) => set((s) => (s.nearKitchen === near ? s : { nearKitchen: near })),
  setNearLibrary: (near) => set((s) => (s.nearLibrary === near ? s : { nearLibrary: near })),
  // Opening any one full-screen panel closes the others.
  open: (id) => set({ active: { id, mode: 'menu' }, boardOpen: false, libraryOpen: false }),
  setMode: (mode) => set((s) => (s.active ? { active: { ...s.active, mode } } : s)),
  close: () => set({ active: null }),
  openBoard: () => set({ boardOpen: true, active: null, libraryOpen: false }),
  closeBoard: () => set({ boardOpen: false }),
  openLibrary: () => set({ libraryOpen: true, active: null, boardOpen: false }),
  closeLibrary: () => set({ libraryOpen: false }),
  toggleBreak: () => set((s) => ({ onBreak: !s.onBreak })),
  // onBreak persists across teardown only within a session — it's a personal
  // presence flag, not transient scene state, so reset() leaves it alone.
  reset: () =>
    set({ nearbyId: null, nearBoard: false, nearKitchen: false, nearLibrary: false, active: null, boardOpen: false, libraryOpen: false }),
}));

'use client';

import { create } from 'zustand';
import type { OfficeAgent } from '@/lib/office/agents';
import { DEFAULT_DESK_ITEMS, parseDeskItems } from '@/lib/office/desk-items';

const LS_CUSTOMISATION_KEY = 'midnite.office.customisation';

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
  /** Whether the player is standing at the PlayStation console. */
  nearPlaystation: boolean;
  /** Whether the player is near the corner-office door (main scene). */
  nearDoor: boolean;
  /** The desk the player opened, plus which panel view is showing. */
  active: { id: string; mode: InteractionMode } | null;
  /** Whether the board room document panel is open. */
  boardOpen: boolean;
  /** Whether the library modal is open. */
  libraryOpen: boolean;
  /** Whether the retro-games menu is open. */
  playstationOpen: boolean;
  /** Whether the corner-office desk-item picker is open. */
  deskPickerOpen: boolean;
  /** Personal "on a coffee break" presence flag (mock — local to this session). */
  onBreak: boolean;
  /** Which Phaser scene is active — drives the HUD (back button vs. normal). */
  currentScene: 'office' | 'corner';
  /** Item ids currently placed on the corner-office desk (persisted to localStorage). */
  deskItems: string[];
  setAgents(agents: OfficeAgent[]): void;
  /**
   * Push-patch a single agent's live activity or attention state without
   * triggering a full sessions+tasks refetch (Phase 31 E1). Called by
   * `use-office-agents` on `agent.activity` / `agent.attention` WS events.
   */
  /** Patch live activity/attention fields on one agent without a full refetch. */
  patchAgent(sessionId: string, patch: Partial<Pick<OfficeAgent, 'liveActivity' | 'liveAttention'>>): void;
  setNearby(id: string | null): void;
  setNearBoard(near: boolean): void;
  setNearKitchen(near: boolean): void;
  setNearLibrary(near: boolean): void;
  setNearPlaystation(near: boolean): void;
  setNearDoor(near: boolean): void;
  open(id: string): void;
  setMode(mode: InteractionMode): void;
  close(): void;
  openBoard(): void;
  closeBoard(): void;
  openLibrary(): void;
  closeLibrary(): void;
  openPlaystation(): void;
  closePlaystation(): void;
  openDeskPicker(): void;
  closeDeskPicker(): void;
  toggleBreak(): void;
  setCurrentScene(scene: 'office' | 'corner'): void;
  setDeskItems(items: string[]): void;
  /** Clear transient UI state — called when the scene tears down. */
  reset(): void;
}

function loadDeskItems(): string[] {
  if (typeof window === 'undefined') return DEFAULT_DESK_ITEMS;
  return parseDeskItems(window.localStorage.getItem(LS_CUSTOMISATION_KEY));
}

export const useOfficeStore = create<OfficeState>((set) => ({
  agents: [],
  nearbyId: null,
  nearBoard: false,
  nearKitchen: false,
  nearLibrary: false,
  nearPlaystation: false,
  nearDoor: false,
  active: null,
  boardOpen: false,
  libraryOpen: false,
  playstationOpen: false,
  deskPickerOpen: false,
  onBreak: false,
  currentScene: 'office',
  deskItems: loadDeskItems(),
  setAgents: (agents) => set({ agents }),
  patchAgent: (sessionId, patch) =>
    set((s) => {
      const idx = s.agents.findIndex((a) => a.id === sessionId);
      if (idx === -1) return s;
      const updated = [...s.agents];
      updated[idx] = { ...updated[idx]!, ...patch };
      return { agents: updated };
    }),
  // Skip the update when unchanged — `update()` calls these every frame.
  setNearby: (id) => set((s) => (s.nearbyId === id ? s : { nearbyId: id })),
  setNearBoard: (near) => set((s) => (s.nearBoard === near ? s : { nearBoard: near })),
  setNearKitchen: (near) => set((s) => (s.nearKitchen === near ? s : { nearKitchen: near })),
  setNearLibrary: (near) => set((s) => (s.nearLibrary === near ? s : { nearLibrary: near })),
  setNearPlaystation: (near) => set((s) => (s.nearPlaystation === near ? s : { nearPlaystation: near })),
  setNearDoor: (near) => set((s) => (s.nearDoor === near ? s : { nearDoor: near })),
  // Opening any one full-screen panel closes the others.
  open: (id) =>
    set({ active: { id, mode: 'menu' }, boardOpen: false, libraryOpen: false, playstationOpen: false, deskPickerOpen: false }),
  setMode: (mode) => set((s) => (s.active ? { active: { ...s.active, mode } } : s)),
  close: () => set({ active: null }),
  openBoard: () => set({ boardOpen: true, active: null, libraryOpen: false, playstationOpen: false, deskPickerOpen: false }),
  closeBoard: () => set({ boardOpen: false }),
  openLibrary: () => set({ libraryOpen: true, active: null, boardOpen: false, playstationOpen: false, deskPickerOpen: false }),
  closeLibrary: () => set({ libraryOpen: false }),
  openPlaystation: () =>
    set({ playstationOpen: true, active: null, boardOpen: false, libraryOpen: false, deskPickerOpen: false }),
  closePlaystation: () => set({ playstationOpen: false }),
  openDeskPicker: () =>
    set({ deskPickerOpen: true, active: null, boardOpen: false, libraryOpen: false, playstationOpen: false }),
  closeDeskPicker: () => set({ deskPickerOpen: false }),
  toggleBreak: () => set((s) => ({ onBreak: !s.onBreak })),
  setCurrentScene: (currentScene) => set({ currentScene }),
  setDeskItems: (deskItems) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LS_CUSTOMISATION_KEY, JSON.stringify(deskItems));
    }
    set({ deskItems });
  },
  // onBreak + deskItems persist across teardown — personal flags, not transient scene state.
  reset: () =>
    set({
      nearbyId: null,
      nearBoard: false,
      nearKitchen: false,
      nearLibrary: false,
      nearPlaystation: false,
      nearDoor: false,
      active: null,
      boardOpen: false,
      libraryOpen: false,
      playstationOpen: false,
      deskPickerOpen: false,
      currentScene: 'office',
    }),
}));

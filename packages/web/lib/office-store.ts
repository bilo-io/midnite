'use client';

import { create } from 'zustand';
import type { OfficeAgent } from '@/lib/office/agents';
import { DEFAULT_DESK_ITEMS, parseDeskItems } from '@/lib/office/desk-items';

const LS_CUSTOMISATION_KEY = 'midnite.office.customisation';
const LS_PLAYER_VARIANT_KEY = 'midnite.office.player-variant';
const LS_PLAYER_TINT_KEY = 'midnite.office.player-tint';

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
  /** Agent-pool capacity (= number of hot desks, A3); null until `/pool` resolves. */
  deskCapacity: number | null;
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
  /** Whether the corner-office character (avatar) picker is open. */
  characterPickerOpen: boolean;
  /** Player avatar: -1 = human, 0–5 = robot variant index (persisted). */
  playerVariant: number;
  /** Sprite tint for the player character (null = natural; persisted). */
  playerTint: number | null;
  /** Personal "on a coffee break" presence flag (mock — local to this session). */
  onBreak: boolean;
  /** Which Phaser scene is active — drives the HUD (back button vs. normal). */
  currentScene: 'office' | 'corner';
  /** Item ids currently placed on the corner-office desk (persisted to localStorage). */
  deskItems: string[];
  setAgents(agents: OfficeAgent[]): void;
  setDeskCapacity(capacity: number): void;
  /**
   * Patch a single agent's live-activity fields without replacing the whole array
   * (Phase 31 Theme E). Used for `agent.activity` / `agent.attention` events so
   * the office scene reacts without a full sessions+tasks refetch.
   */
  patchAgent(id: string, patch: Partial<Pick<OfficeAgent, 'liveActivity' | 'attention'>>): void;
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
  openCharacterPicker(): void;
  closeCharacterPicker(): void;
  setPlayerVariant(variant: number): void;
  setPlayerTint(tint: number | null): void;
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

function loadPlayerVariant(): number {
  if (typeof window === 'undefined') return -1;
  const raw = window.localStorage.getItem(LS_PLAYER_VARIANT_KEY);
  if (!raw) return -1;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < -1 || n > 5 ? -1 : n;
}

function loadPlayerTint(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(LS_PLAYER_TINT_KEY);
  if (!raw || raw === 'null') return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  agents: [],
  deskCapacity: null,
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
  characterPickerOpen: false,
  onBreak: false,
  currentScene: 'office',
  deskItems: loadDeskItems(),
  playerVariant: loadPlayerVariant(),
  playerTint: loadPlayerTint(),
  setAgents: (agents) => set({ agents }),
  setDeskCapacity: (capacity) => set({ deskCapacity: capacity }),
  patchAgent: (id, patch) =>
    set((s) => {
      const idx = s.agents.findIndex((a) => a.id === id);
      if (idx === -1) return s; // session not yet visible — ignore
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
    set({ deskPickerOpen: true, characterPickerOpen: false, active: null, boardOpen: false, libraryOpen: false, playstationOpen: false }),
  closeDeskPicker: () => set({ deskPickerOpen: false }),
  openCharacterPicker: () =>
    set({ characterPickerOpen: true, deskPickerOpen: false, active: null, boardOpen: false, libraryOpen: false, playstationOpen: false }),
  closeCharacterPicker: () => set({ characterPickerOpen: false }),
  setPlayerVariant: (playerVariant) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LS_PLAYER_VARIANT_KEY, String(playerVariant));
    }
    set({ playerVariant });
  },
  setPlayerTint: (playerTint) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LS_PLAYER_TINT_KEY, playerTint === null ? 'null' : String(playerTint));
    }
    set({ playerTint });
  },
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
      characterPickerOpen: false,
      currentScene: 'office',
    }),
}));

import { describe, expect, it, vi } from 'vitest';

import {
  applyInteraction,
  pickInteraction,
  type InteractionStore,
  type ProximityState,
} from './interactions';

/**
 * Phase 63 Theme G — the store-contract spec. The 3D scene is a second client of
 * the office store: pressing `E` runs `pickInteraction` (proximity → action) then
 * `applyInteraction` (action → store call). This spec pins that pipeline to the
 * store transition the 2D `tryInteract`
 * ([`office-scene.ts`](../../components/office/scenes/office-scene.ts)) performs for
 * each interactable, so the shared panels/modals keep working identically.
 *
 * Two interactions **intentionally diverge** in 3D (documented, not bugs): the
 * console enters the immersive arcade room (`enterArcade`) rather than opening the
 * RetroGamesMenu, and the door enters the 3D corner room (`enterCorner`). Every
 * other transition is byte-for-byte the same store method the 2D scene calls.
 */

function fakeStore() {
  return {
    openBoard: vi.fn(),
    toggleBreak: vi.fn(),
    openLibrary: vi.fn(),
    enterArcade: vi.fn(),
    enterCorner: vi.fn(),
    open: vi.fn(),
  } satisfies InteractionStore;
}

const base: ProximityState = {
  nearbyId: null,
  nearBoard: false,
  nearKitchen: false,
  nearLibrary: false,
  nearPlaystation: false,
  nearDoor: false,
};

/** Each interactable → the store method the dispatch must invoke. */
const CONTRACT: {
  name: string;
  prox: ProximityState;
  method: keyof ReturnType<typeof fakeStore>;
  arg?: unknown;
  note: string;
}[] = [
  { name: 'board whiteboard', prox: { ...base, nearBoard: true }, method: 'openBoard', note: '2D parity' },
  { name: 'coffee machine', prox: { ...base, nearKitchen: true }, method: 'toggleBreak', note: '2D parity' },
  { name: 'library bookshelf', prox: { ...base, nearLibrary: true }, method: 'openLibrary', note: '2D parity' },
  { name: 'lounge console', prox: { ...base, nearPlaystation: true }, method: 'enterArcade', note: '3D: immersive arcade room' },
  { name: 'corner-office door', prox: { ...base, nearDoor: true }, method: 'enterCorner', note: '3D: 3D corner room' },
  { name: 'desk agent', prox: { ...base, nearbyId: 'sess-9' }, method: 'open', arg: 'sess-9', note: '2D parity' },
];

describe('3D interaction dispatch → store contract', () => {
  for (const { name, prox, method, arg, note } of CONTRACT) {
    it(`${name} → store.${method}() (${note})`, () => {
      const store = fakeStore();
      applyInteraction(pickInteraction(prox), store);
      if (arg !== undefined) expect(store[method]).toHaveBeenCalledWith(arg);
      else expect(store[method]).toHaveBeenCalledOnce();
      // Exactly one transition fires per interaction.
      const totalCalls = Object.values(store).reduce((n, fn) => n + fn.mock.calls.length, 0);
      expect(totalCalls).toBe(1);
    });
  }

  it('no interactable in reach → no store transition', () => {
    const store = fakeStore();
    applyInteraction(pickInteraction(base), store);
    const totalCalls = Object.values(store).reduce((n, fn) => n + fn.mock.calls.length, 0);
    expect(totalCalls).toBe(0);
  });

  it('honours 2D tryInteract priority: board wins over a co-located agent', () => {
    const store = fakeStore();
    applyInteraction(pickInteraction({ ...base, nearBoard: true, nearbyId: 'sess-1' }), store);
    expect(store.openBoard).toHaveBeenCalledOnce();
    expect(store.open).not.toHaveBeenCalled();
  });
});

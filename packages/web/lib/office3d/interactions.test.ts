import { describe, expect, it, vi } from 'vitest';

import type { OfficeAgent } from '@/lib/office/agents';
import { BOARD_POS, COFFEE_POS } from '@/lib/office/layout';
import type { AvatarPlacement } from './agents-3d';
import { tileToWorld } from './constants';
import {
  ANCHORS,
  applyInteraction,
  buildTargets,
  pickInteraction,
  raycastPick,
  resolveProximity,
  type InteractionStore,
} from './interactions';

function avatar(id: string, x: number, z: number, interactable = true): AvatarPlacement {
  return {
    agent: { id, name: id } as unknown as OfficeAgent,
    x,
    z,
    kind: interactable ? 'desk' : 'lounge',
    interactable,
    tint: 0,
    variant: 0,
  };
}

const boardW = tileToWorld(BOARD_POS.x, BOARD_POS.y);
const coffeeW = tileToWorld(COFFEE_POS.x, COFFEE_POS.y);

describe('resolveProximity', () => {
  it('flags the board when the player stands on it', () => {
    const p = resolveProximity(boardW.x, boardW.z, []);
    expect(p.nearBoard).toBe(true);
    expect(p.nearKitchen).toBe(false);
  });

  it('picks the nearest interactable avatar within reach', () => {
    const near = avatar('near', 10, 10);
    const far = avatar('far', 10.4, 10);
    const p = resolveProximity(10, 10, [near, far]);
    expect(p.nearbyId).toBe('near');
  });

  it('ignores non-interactable (lounging) avatars', () => {
    const p = resolveProximity(10, 10, [avatar('lounge', 10, 10, false)]);
    expect(p.nearbyId).toBeNull();
  });

  it('reports no nearby agent when out of reach', () => {
    const p = resolveProximity(0, 0, [avatar('x', 20, 20)]);
    expect(p.nearbyId).toBeNull();
  });
});

describe('pickInteraction — 2D tryInteract priority', () => {
  it('prioritises board over a nearby agent', () => {
    expect(
      pickInteraction({ nearbyId: 'a', nearBoard: true, nearKitchen: false, nearLibrary: false, nearPlaystation: false }),
    ).toEqual({ kind: 'board' });
  });

  it('maps kitchen proximity to a break toggle', () => {
    expect(
      pickInteraction({ nearbyId: null, nearBoard: false, nearKitchen: true, nearLibrary: false, nearPlaystation: false }),
    ).toEqual({ kind: 'break' });
  });

  it('falls through to the nearby agent when no fixture is in reach', () => {
    expect(
      pickInteraction({ nearbyId: 'sess-1', nearBoard: false, nearKitchen: false, nearLibrary: false, nearPlaystation: false }),
    ).toEqual({ kind: 'agent', id: 'sess-1' });
  });

  it('returns null when nothing is in reach', () => {
    expect(
      pickInteraction({ nearbyId: null, nearBoard: false, nearKitchen: false, nearLibrary: false, nearPlaystation: false }),
    ).toBeNull();
  });
});

describe('raycastPick — crosshair aim', () => {
  it('hits an anchor the player faces', () => {
    // Stand a couple of units south of the board, looking north (−z) at it.
    const action = raycastPick(boardW.x, boardW.z + 2, 0, -1, buildTargets([]));
    expect(action).toEqual({ kind: 'board' });
  });

  it('misses when looking away from every target', () => {
    const action = raycastPick(boardW.x, boardW.z + 2, 0, 1, buildTargets([]));
    expect(action).toBeNull();
  });

  it('hits an interactable avatar under the crosshair', () => {
    const targets = buildTargets([avatar('sess', 5, 3)]);
    const action = raycastPick(5, 4, 0, -1, targets);
    expect(action).toEqual({ kind: 'agent', id: 'sess' });
  });
});

describe('applyInteraction — store contract parity', () => {
  function fakeStore() {
    return {
      openBoard: vi.fn(),
      toggleBreak: vi.fn(),
      openLibrary: vi.fn(),
      enterArcade: vi.fn(),
      open: vi.fn(),
    } satisfies InteractionStore;
  }

  it('dispatches each action to the matching store transition', () => {
    const s = fakeStore();
    applyInteraction({ kind: 'board' }, s);
    applyInteraction({ kind: 'break' }, s);
    applyInteraction({ kind: 'library' }, s);
    applyInteraction({ kind: 'playstation' }, s);
    applyInteraction({ kind: 'agent', id: 'x1' }, s);
    expect(s.openBoard).toHaveBeenCalledOnce();
    expect(s.toggleBreak).toHaveBeenCalledOnce();
    expect(s.openLibrary).toHaveBeenCalledOnce();
    // The 3D console enters the immersive arcade room (not the RetroGamesMenu).
    expect(s.enterArcade).toHaveBeenCalledOnce();
    expect(s.open).toHaveBeenCalledWith('x1');
  });

  it('is a no-op for a null action', () => {
    const s = fakeStore();
    applyInteraction(null, s);
    expect(s.openBoard).not.toHaveBeenCalled();
    expect(s.open).not.toHaveBeenCalled();
  });
});

describe('ANCHORS', () => {
  it('places the kitchen anchor at the coffee machine', () => {
    const kitchen = ANCHORS.find((a) => a.kind === 'kitchen')!;
    expect(kitchen.x).toBeCloseTo(coffeeW.x);
    expect(kitchen.z).toBeCloseTo(coffeeW.z);
  });
});

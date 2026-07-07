import { describe, expect, it } from 'vitest';
import { sceneFacing } from './presence-bridge';
import { charForVariant, facingToDir } from './presence-visual';

describe('charForVariant', () => {
  it('maps -1 to the human sheet and 0–5 to robot variants', () => {
    expect(charForVariant(-1)).toEqual({ kind: 'human', v: 0 });
    expect(charForVariant(0)).toEqual({ kind: 'robot', v: 0 });
    expect(charForVariant(3)).toEqual({ kind: 'robot', v: 3 });
  });
});

describe('facingToDir', () => {
  it('maps wire facing to the 2D sprite direction + flip', () => {
    expect(facingToDir('up')).toEqual({ dir: 'up', flip: false });
    expect(facingToDir('down')).toEqual({ dir: 'down', flip: false });
    expect(facingToDir('left')).toEqual({ dir: 'side', flip: true });
    expect(facingToDir('right')).toEqual({ dir: 'side', flip: false });
  });
});

describe('sceneFacing (bridge)', () => {
  it('round-trips through facingToDir for every direction', () => {
    expect(sceneFacing('up', false)).toBe('up');
    expect(sceneFacing('down', false)).toBe('down');
    expect(sceneFacing('side', true)).toBe('left');
    expect(sceneFacing('side', false)).toBe('right');
    // left → side+flip → left again
    const wire = sceneFacing('side', true);
    expect(facingToDir(wire)).toEqual({ dir: 'side', flip: true });
  });
});

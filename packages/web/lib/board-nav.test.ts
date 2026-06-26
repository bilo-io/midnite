import { describe, expect, it } from 'vitest';

import { arrowDir, nextFocusId, type FocusGrid } from './board-nav';

// A 3-column board: Todo has 3 cards, Wip 1, Done 2.
const grid: FocusGrid = [
  ['t1', 't2', 't3'],
  ['w1'],
  ['d1', 'd2'],
];

describe('nextFocusId', () => {
  it('seeds focus to the first card when nothing is focused', () => {
    expect(nextFocusId(grid, null, 'down')).toBe('t1');
    expect(nextFocusId(grid, 'unknown-id', 'up')).toBe('t1');
  });

  it('returns null for an empty board', () => {
    expect(nextFocusId([[], []], null, 'down')).toBeNull();
  });

  it('moves down/up within a column and clamps at the ends', () => {
    expect(nextFocusId(grid, 't1', 'down')).toBe('t2');
    expect(nextFocusId(grid, 't3', 'down')).toBe('t3'); // clamp at bottom
    expect(nextFocusId(grid, 't2', 'up')).toBe('t1');
    expect(nextFocusId(grid, 't1', 'up')).toBe('t1'); // clamp at top
  });

  it('moves right/left to the adjacent column, preferring the same row', () => {
    expect(nextFocusId(grid, 't1', 'right')).toBe('w1');
    expect(nextFocusId(grid, 'w1', 'right')).toBe('d1');
    expect(nextFocusId(grid, 'd2', 'left')).toBe('w1'); // wip has one card → clamps to last
    expect(nextFocusId(grid, 'w1', 'left')).toBe('t1');
  });

  it('falls back to the last card when the target column is shorter', () => {
    // From Todo row 2 (t3) → Wip has only row 0, so clamp to w1.
    expect(nextFocusId(grid, 't3', 'right')).toBe('w1');
  });

  it('skips empty columns when moving sideways', () => {
    const sparse: FocusGrid = [['a'], [], ['c']];
    expect(nextFocusId(sparse, 'a', 'right')).toBe('c');
    expect(nextFocusId(sparse, 'c', 'left')).toBe('a');
  });

  it('returns the current id when there is no adjacent column', () => {
    expect(nextFocusId(grid, 't1', 'left')).toBe('t1');
    expect(nextFocusId(grid, 'd1', 'right')).toBe('d1');
  });
});

describe('arrowDir', () => {
  it('maps arrow keys to directions and ignores others', () => {
    expect(arrowDir('ArrowDown')).toBe('down');
    expect(arrowDir('ArrowUp')).toBe('up');
    expect(arrowDir('ArrowRight')).toBe('right');
    expect(arrowDir('ArrowLeft')).toBe('left');
    expect(arrowDir('Enter')).toBeNull();
  });
});

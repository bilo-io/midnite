/**
 * Pure focus-navigation math for the kanban board (Phase 41 Theme D).
 *
 * The board is modelled as a grid: an ordered array of columns, each an ordered
 * array of task ids (only the *visible* cards, in render order). Given the
 * currently-focused id and an arrow direction, `nextFocusId` returns the id that
 * should receive focus next — or the current id when the move is a no-op (e.g.
 * `down` on the last card of a column), or `null` when the board is empty.
 *
 * Kept free of React so the navigation rules can be unit-tested directly.
 */
export type FocusGrid = string[][];
export type ArrowDir = 'up' | 'down' | 'left' | 'right';

/** Locate an id in the grid → `[columnIndex, rowIndex]`, or null if absent. */
function locate(grid: FocusGrid, id: string): [number, number] | null {
  for (let col = 0; col < grid.length; col++) {
    const row = grid[col]?.indexOf(id) ?? -1;
    if (row !== -1) return [col, row];
  }
  return null;
}

/** First non-empty column at or after `from` (scanning by `step`), else -1. */
function nearestColumn(grid: FocusGrid, from: number, step: 1 | -1): number {
  for (let col = from; col >= 0 && col < grid.length; col += step) {
    if ((grid[col]?.length ?? 0) > 0) return col;
  }
  return -1;
}

/** The id at a grid position, or null when out of range. */
function at(grid: FocusGrid, col: number, row: number): string | null {
  return grid[col]?.[row] ?? null;
}

/** First card of the first non-empty column, or null when the grid is empty. */
function firstCard(grid: FocusGrid): string | null {
  const col = nearestColumn(grid, 0, 1);
  return col === -1 ? null : at(grid, col, 0);
}

/**
 * Compute the next focused id for an arrow press.
 *
 * - `↓`/`↑` move within the same column (clamped at the ends).
 * - `→`/`←` jump to the nearest non-empty adjacent column, preferring the same
 *   row, else that column's last card.
 * - With nothing focused (or a stale id), any arrow seeds focus to the first card.
 */
export function nextFocusId(grid: FocusGrid, current: string | null, dir: ArrowDir): string | null {
  const pos = current ? locate(grid, current) : null;
  if (!pos) return firstCard(grid);

  const [col, row] = pos;
  const colLen = grid[col]?.length ?? 0;

  switch (dir) {
    case 'down':
      return at(grid, col, Math.min(row + 1, colLen - 1));
    case 'up':
      return at(grid, col, Math.max(row - 1, 0));
    case 'right':
    case 'left': {
      const step = dir === 'right' ? 1 : -1;
      const target = nearestColumn(grid, col + step, step);
      if (target === -1) return current;
      const targetLen = grid[target]?.length ?? 0;
      return at(grid, target, Math.min(row, targetLen - 1));
    }
  }
}

/** Map an arrow key event's `key` to a direction, or null if it isn't an arrow. */
export function arrowDir(key: string): ArrowDir | null {
  switch (key) {
    case 'ArrowDown':
      return 'down';
    case 'ArrowUp':
      return 'up';
    case 'ArrowRight':
      return 'right';
    case 'ArrowLeft':
      return 'left';
    default:
      return null;
  }
}

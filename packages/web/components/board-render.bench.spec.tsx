import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Status, Task } from '@midnite/shared';
import { BoardView } from './board-view';
import { COLUMNS } from './task-columns';
import { ConfirmProvider } from './confirm-dialog';

/**
 * Phase 57 A — web render benchmark (evidence backbone). Renders the board with a
 * seeded task set and counts **mounted card nodes** — the deterministic metric
 * that proves the "every card is in the DOM, no virtualization" baseline. Theme F
 * (virtualization) tightens this budget to a bounded constant; here we document
 * that today the mounted count grows 1:1 with the dataset.
 */
const SIZE = Number(process.env['BENCH_SIZE']) || 200;

function task(i: number, status: Status): Task {
  const at = new Date(Date.parse('2026-01-01T00:00:00Z') + i * 1000).toISOString();
  return {
    id: `perf-${i}`,
    title: `PerfCard ${i}`,
    kind: 'unknown',
    status,
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    dependsOn: [],
    events: [],
    createdAt: at,
    updatedAt: at,
  } as Task;
}

afterEach(cleanup);

describe(`Phase 57 A — web board render benchmark (n=${SIZE})`, () => {
  it('mounts one card per task — documents the un-virtualized DOM baseline', () => {
    const tasks = Array.from({ length: SIZE }, (_, i) => task(i, 'todo'));
    render(
      <ConfirmProvider>
        <BoardView
          tasks={tasks}
          columns={COLUMNS}
          projectsById={new Map()}
          onSelect={vi.fn()}
          showAbandoned={false}
          onMove={vi.fn()}
          isSelected={() => false}
          onToggleSelect={vi.fn()}
          blockedCounts={new Map()}
        />
      </ConfirmProvider>,
    );

    // Each card renders a button whose accessible name carries its title.
    const cards = screen.getAllByRole('button').filter((b) => /PerfCard \d+/.test(b.textContent ?? ''));
    // eslint-disable-next-line no-console -- benchmark output is the point
    console.log(`[bench] board mounted cards: ${cards.length} of ${SIZE} tasks`);

    // Baseline: unbounded — every task mounts a card. Theme F bounds this to a
    // small windowed constant and flips this assertion.
    expect(cards.length).toBe(SIZE);
    // Generous timeout: rendering N cards in jsdom is slow under parallel suite
    // load (well past the 5s default), so budget it explicitly to avoid a flake.
  }, 30_000);
});

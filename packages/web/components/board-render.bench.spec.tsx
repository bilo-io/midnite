import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Status, Task } from '@midnite/shared';
import { BoardView } from './board-view';
import { COLUMNS } from './task-columns';
import { ConfirmProvider } from './confirm-dialog';
import { withLocale } from '@/lib/test-locale-wrapper';

/**
 * Web render benchmark (evidence backbone). Renders the board with a seeded task
 * set and counts **mounted card nodes**. Phase 82 un-windowed the board: columns
 * now grow to their full content height and the whole PAGE scrolls (so a full
 * board reads as a tall page), which means every card mounts — the count is 1:1
 * with the dataset. This asserts that, and stands as the render-cost baseline.
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

describe(`web board render benchmark (n=${SIZE})`, () => {
  it('mounts every card so the board grows with the page (un-windowed)', () => {
    const tasks = Array.from({ length: SIZE }, (_, i) => task(i, 'todo'));
    render(
      withLocale(
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
      ),
    );

    // Each card renders a button whose accessible name carries its title.
    const cards = screen.getAllByRole('button').filter((b) => /PerfCard \d+/.test(b.textContent ?? ''));
    // eslint-disable-next-line no-console -- benchmark output is the point
    console.log(`[bench] board mounted cards: ${cards.length} of ${SIZE} tasks`);

    // Phase 82: the board is no longer windowed — every card mounts so the column
    // grows to its full height and the page (not the column) scrolls.
    expect(cards.length).toBe(SIZE);
    // Generous timeout: rendering N cards in jsdom is slow under parallel suite
    // load (well past the 5s default), so budget it explicitly to avoid a flake.
  }, 30_000);
});

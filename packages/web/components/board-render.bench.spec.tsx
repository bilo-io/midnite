import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Status, Task } from '@midnite/shared';
import { BoardView } from './board-view';
import { COLUMNS } from './task-columns';
import { ConfirmProvider } from './confirm-dialog';
import { withLocale } from '@/lib/test-locale-wrapper';

/**
 * Phase 57 A — web render benchmark (evidence backbone). Renders the board with a
 * seeded task set and counts **mounted card nodes**. Theme F virtualized the
 * board, so the mounted count is now **bounded** (windowed), not 1:1 with the
 * dataset — this asserts that bound. (jsdom has no viewport height, so the exact
 * windowed count isn't meaningful here; the nonzero-but-bounded proof against a
 * real browser lives in `e2e/board-virtualization.e2e.ts`.)
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
  it('bounds mounted cards below the dataset size (windowed board)', () => {
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

    // Theme F: the board is windowed — the mounted card count is bounded well
    // below the dataset size (the whole point). Exact count is layout-dependent
    // and not meaningful in jsdom; the real-browser proof is the e2e.
    expect(cards.length).toBeLessThan(SIZE);
    // Generous timeout: rendering N cards in jsdom is slow under parallel suite
    // load (well past the 5s default), so budget it explicitly to avoid a flake.
  }, 30_000);
});

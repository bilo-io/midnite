import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test/db';
import { seedLargeDataset } from '../test/seed-large';
import { TasksRepository } from './tasks.repository';

/**
 * Phase 57 B — `hydrateMany` must be **behavior-preserving**: for any set of
 * rows it produces exactly what `rows.map(hydrate)` would, only with batched
 * queries. This proves parity (including across a >ID_CHUNK id list, so the
 * chunking + in-memory grouping is exercised) rather than just trusting the
 * query-count benchmark.
 */
describe('TasksRepository.hydrateMany — parity with hydrate()', () => {
  let handle: TestDbHandle;
  let repo: TasksRepository;

  beforeEach(() => {
    handle = createTestDb();
    repo = new TasksRepository(handle.db);
  });
  afterEach(() => handle.close());

  it('matches rows.map(hydrate) row-for-row across a chunk boundary (>500 tasks)', () => {
    // 600 > ID_CHUNK (500) → hydrateMany must chunk and stitch results back together.
    seedLargeDataset(handle.db, { tasks: 600, workflows: 0, seed: 7 });
    const rows = repo.listTasks();
    expect(rows.length).toBe(600);

    const oneByOne = rows.map((r) => repo.hydrate(r));
    const batched = repo.hydrateMany(rows);

    expect(batched).toEqual(oneByOne);
  });

  it('returns [] for an empty page without touching the db', () => {
    expect(repo.hydrateMany([])).toEqual([]);
  });

  it('preserves the legacy prUrl→link fallback for a task with no task_links', () => {
    const now = '2026-07-05T00:00:00.000Z';
    repo.insertTask({
      id: 'legacy-task',
      title: 'has a legacy prUrl only',
      status: 'todo',
      priority: 1,
      prUrl: 'https://github.com/o/r/pull/9',
      createdAt: now,
      updatedAt: now,
    });
    const rows = repo.listTasks();
    const single = rows.map((r) => repo.hydrate(r))[0];
    const batched = repo.hydrateMany(rows)[0];
    expect(batched).toBeDefined();
    expect(batched).toEqual(single);
    expect(batched?.links).toHaveLength(1);
    const legacyLink = batched?.links?.[0];
    expect(legacyLink?.id).toBe('legacy-legacy-task');
    expect(legacyLink?.url).toBe('https://github.com/o/r/pull/9');
  });
});

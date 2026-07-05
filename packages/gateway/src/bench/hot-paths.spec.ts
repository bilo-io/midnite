import { performance } from 'node:perf_hooks';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { workflows } from '../db/schema';
import { createCountingDb, type CountingDbHandle } from '../test/db';
import { seedLargeDataset } from '../test/seed-large';
import { TasksRepository } from '../tasks/tasks.repository';
import { WorkflowsRepository } from '../workflows/workflows.repository';

/**
 * Phase 57 gateway hot-path benchmark (evidence backbone). Seeds a deterministic
 * dataset, counts the SQL statements each hot path issues (via the `verbose`
 * driver hook), prints query-count + wall-time, and **budget-asserts the query
 * count** (deterministic; wall-time is printed only — too noisy in CI).
 *
 * Theme A established these against the old N+1 baseline; **Theme B** replaced the
 * per-row hydration with batched loads, so the budgets are now a small **constant
 * per page** (`~6 relation queries + 1 list`, times the number of id-chunks) — not
 * `6N`. The floor that documented the N+1 is gone; the ceiling now guards the win
 * against regression. Batching chunks ids at 500 (SQLite's bound-param ceiling), so
 * the expected query count scales with `ceil(N / 500)`, not `N`. Size is modest by
 * default so the suite stays fast; `BENCH_SIZE=10000` runs the full profile.
 */
const SIZE = Number(process.env['BENCH_SIZE']) || 400;
const ID_CHUNK = 500;
const chunks = (n: number): number => Math.max(1, Math.ceil(n / ID_CHUNK));

describe(`Phase 57 B — gateway hot-path benchmark (n=${SIZE})`, () => {
  let h: CountingDbHandle;
  beforeEach(() => {
    h = createCountingDb();
  });
  afterEach(() => h.close());

  it('listTasks + hydrateMany — batched, constant queries per page (not 6N)', () => {
    const seeded = seedLargeDataset(h.db, { tasks: SIZE, workflows: 0 });
    const repo = new TasksRepository(h.db);

    h.resetQueryCount();
    const t0 = performance.now();
    const rows = repo.listTasks();
    const hydrated = repo.hydrateMany(rows);
    const ms = performance.now() - t0;
    const q = h.queryCount();
    const bytes = JSON.stringify(hydrated).length;

    // eslint-disable-next-line no-console -- benchmark output is the point
    console.log(`[bench] listTasks+hydrateMany: ${hydrated.length} tasks · ${q} queries · ${bytes} bytes · ${ms.toFixed(1)}ms`);

    expect(hydrated.length).toBe(seeded.tasks);
    // Batched: 1 list query + 6 relation queries per id-chunk. Ceiling = that + slack.
    expect(q).toBeLessThanOrEqual(6 * chunks(seeded.tasks) + 5);
    // Regression guard: the win is real — far below the old ~6N (proves sub-linear).
    expect(q).toBeLessThan(seeded.tasks);
  }, 20_000);

  it('workflow summaries — batched latest-run lookup (not N+1)', () => {
    const seeded = seedLargeDataset(h.db, { tasks: 0, workflows: SIZE });
    const repo = new WorkflowsRepository(h.db);

    h.resetQueryCount();
    const t0 = performance.now();
    const rows = h.db.select().from(workflows).all();
    const latest = repo.latestRunRowsByWorkflowIds(rows.map((r) => r.id));
    const ms = performance.now() - t0;
    const q = h.queryCount();

    // eslint-disable-next-line no-console -- benchmark output is the point
    console.log(`[bench] workflow summaries: ${rows.length} workflows · ${latest.size} with runs · ${q} queries · ${ms.toFixed(1)}ms`);

    expect(rows.length).toBe(seeded.workflows);
    // Batched: 1 list query + 1 latest-run query per id-chunk. Ceiling = that + slack.
    expect(q).toBeLessThanOrEqual(chunks(seeded.workflows) + 3);
    expect(q).toBeLessThan(seeded.workflows);
  }, 20_000);
});

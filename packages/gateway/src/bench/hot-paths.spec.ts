import { performance } from 'node:perf_hooks';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { workflows } from '../db/schema';
import { createCountingDb, type CountingDbHandle } from '../test/db';
import { seedLargeDataset } from '../test/seed-large';
import { TasksRepository } from '../tasks/tasks.repository';
import { WorkflowsRepository } from '../workflows/workflows.repository';

/**
 * Phase 57 A — gateway hot-path benchmark (evidence backbone). Seeds a
 * deterministic dataset, counts the SQL statements each hot path issues (via the
 * `verbose` driver hook), prints query-count + wall-time, and **budget-asserts
 * the query count** (deterministic; wall-time is printed only — too noisy in CI).
 *
 * These are **baseline** budgets: they document today's N+1 (~6 queries/task) and
 * fail if it gets *worse*. Theme B tightens them to a small constant once it lands
 * (and removes the "N+1 still present" floor). Size is modest by default so the
 * suite stays fast; `BENCH_SIZE=10000` runs the full profile.
 */
const SIZE = Number(process.env['BENCH_SIZE']) || 400;

describe(`Phase 57 A — gateway hot-path benchmark (n=${SIZE})`, () => {
  let h: CountingDbHandle;
  beforeEach(() => {
    h = createCountingDb();
  });
  afterEach(() => h.close());

  it('listTasks + hydrate — documents the ~6N task-hydration N+1', () => {
    const seeded = seedLargeDataset(h.db, { tasks: SIZE, workflows: 0 });
    const repo = new TasksRepository(h.db);

    h.resetQueryCount();
    const t0 = performance.now();
    const rows = repo.listTasks();
    const hydrated = rows.map((r) => repo.hydrate(r));
    const ms = performance.now() - t0;
    const q = h.queryCount();
    const bytes = JSON.stringify(hydrated).length;

    // eslint-disable-next-line no-console -- benchmark output is the point
    console.log(`[bench] listTasks+hydrate: ${hydrated.length} tasks · ${q} queries · ${bytes} bytes · ${ms.toFixed(1)}ms`);

    expect(hydrated.length).toBe(seeded.tasks);
    // Baseline: hydrate() fires ~6 queries/task today. Ceiling = 7N + slack.
    expect(q).toBeLessThanOrEqual(seeded.tasks * 7 + 10);
    // Floor documents the N+1 is real (guards the harness itself); Theme B removes this.
    expect(q).toBeGreaterThan(seeded.tasks * 5);
  }, 20_000);

  it('workflow summaries — documents the latestRunRow N+1', () => {
    const seeded = seedLargeDataset(h.db, { tasks: 0, workflows: SIZE });
    const repo = new WorkflowsRepository(h.db);

    h.resetQueryCount();
    const t0 = performance.now();
    const rows = h.db.select().from(workflows).all();
    for (const r of rows) repo.latestRunRow(r.id);
    const ms = performance.now() - t0;
    const q = h.queryCount();

    // eslint-disable-next-line no-console -- benchmark output is the point
    console.log(`[bench] workflow summaries: ${rows.length} workflows · ${q} queries · ${ms.toFixed(1)}ms`);

    expect(rows.length).toBe(seeded.workflows);
    // Baseline: 1 list query + 1 latestRunRow query/workflow (N+1). Ceiling = N + slack.
    expect(q).toBeLessThanOrEqual(seeded.workflows + 5);
    expect(q).toBeGreaterThanOrEqual(seeded.workflows);
  }, 20_000);
});

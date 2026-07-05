import {
  prStatus,
  taskCheckRuns,
  taskDependencies,
  taskEvents,
  taskLinks,
  tasks,
  workflowRuns,
  workflows,
} from '../db/schema';
import type { MidniteDb } from '../db/db.module';

/**
 * Phase 57 A — a deterministic large-dataset seed for the benchmark harness.
 * A fixed-seed PRNG (mulberry32) makes runs reproducible + comparable; sizes are
 * configurable so CI stays fast (modest default) while a full 10k profile is one
 * env var away (`BENCH_SIZE`). Writes realistic hydration depth per task (events,
 * links, deps, prStatus, checkRuns) so the N+1 benchmark measures a real load.
 */

/** Tiny deterministic PRNG — same seed ⇒ same dataset, so benchmarks compare. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeedOptions {
  tasks?: number;
  workflows?: number;
  seed?: number;
}

export interface SeedCounts {
  tasks: number;
  taskEvents: number;
  taskLinks: number;
  taskDependencies: number;
  prStatus: number;
  taskCheckRuns: number;
  workflows: number;
  workflowRuns: number;
}

const T0 = Date.parse('2026-01-01T00:00:00.000Z');
const iso = (offsetMs: number): string => new Date(T0 + offsetMs).toISOString();
const STATUSES = ['todo', 'wip', 'waiting', 'done', 'backlog'] as const;

/**
 * Seed `opts.tasks` tasks (each with events/links/deps/prStatus/checkRuns) and
 * `opts.workflows` workflows (each with a run). Returns the row counts written.
 * All inserts run in one transaction so seeding a big set stays fast.
 */
export function seedLargeDataset(db: MidniteDb, opts: SeedOptions = {}): SeedCounts {
  const nTasks = opts.tasks ?? 2000;
  const nWorkflows = opts.workflows ?? 200;
  const rand = mulberry32(opts.seed ?? 1);
  const counts: SeedCounts = {
    tasks: 0,
    taskEvents: 0,
    taskLinks: 0,
    taskDependencies: 0,
    prStatus: 0,
    taskCheckRuns: 0,
    workflows: 0,
    workflowRuns: 0,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw seed rows for any table; shapes mirror the schema
  const ins = (table: any, row: Record<string, unknown>): void => {
    db.insert(table).values(row).run();
  };

  db.transaction(() => {
    for (let i = 0; i < nTasks; i++) {
      const id = `task-${i}`;
      const createdAt = iso(i * 1000);
      ins(tasks, {
        id,
        title: `Task ${i}`,
        status: STATUSES[i % STATUSES.length],
        priority: Math.floor(rand() * 4),
        retryCount: 0,
        fixAttempts: 0,
        tags: JSON.stringify(i % 3 === 0 ? ['perf', 'seed'] : []),
        createdAt,
        updatedAt: createdAt,
      });
      counts.tasks++;

      // 3 events / task (realistic thread depth).
      for (let e = 0; e < 3; e++) {
        ins(taskEvents, { id: `${id}-e${e}`, taskId: id, at: iso(i * 1000 + e), kind: 'status', data: JSON.stringify({ e }) });
        counts.taskEvents++;
      }
      // 1 link / task.
      ins(taskLinks, { id: `${id}-l0`, taskId: id, url: `https://ex/${i}`, kind: 'pr', createdAt });
      counts.taskLinks++;
      // ~1 checkRun / task.
      ins(taskCheckRuns, { id: `${id}-c0`, taskId: id, trigger: 'gate', passed: 1, startedAt: createdAt, finishedAt: createdAt, results: '[]' });
      counts.taskCheckRuns++;
      // prStatus on ~half.
      if (rand() < 0.5) {
        ins(prStatus, { taskId: id, url: `https://ex/${i}/pr`, number: i, state: 'open', checks: 'passing', fetchedAt: createdAt });
        counts.prStatus++;
      }
      // dependency edge to the previous task on ~a third (realistic blocker depth).
      if (i > 0 && rand() < 0.33) {
        ins(taskDependencies, { taskId: id, dependsOnTaskId: `task-${i - 1}`, createdAt });
        counts.taskDependencies++;
      }
    }

    for (let w = 0; w < nWorkflows; w++) {
      const id = `wf-${w}`;
      const createdAt = iso(w * 1000);
      ins(workflows, {
        id,
        name: `Workflow ${w}`,
        enabled: w % 2,
        triggerType: 'manual',
        trigger: JSON.stringify({ type: 'manual' }),
        graph: JSON.stringify({ nodes: [], edges: [] }),
        createdAt,
        updatedAt: createdAt,
      });
      counts.workflows++;
      // A couple of runs each, so latestRunRow has something to pick.
      for (let r = 0; r < 2; r++) {
        ins(workflowRuns, { id: `${id}-r${r}`, workflowId: id, status: 'completed', triggerSource: 'manual', startedAt: iso(w * 1000 + r) });
        counts.workflowRuns++;
      }
    }
  });

  return counts;
}

import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, gte, isNotNull, lt, lte, sql } from 'drizzle-orm';

import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  agentRunStats,
  gaugeSamples,
  taskEvents,
  tasks,
  type AgentRunStatsInsert,
  type GaugeSampleInsert,
  type GaugeSampleRow,
} from '../db/schema';

export type RunOutcome = 'done' | 'abandoned' | 'failed' | 'cancelled';

/** Row returned by `countByDay` — how many runs started on each calendar day. */
export interface RunCountByDay {
  day: string;
  count: number;
}

/** Distribution of completed run durations across fixed buckets. */
export interface DurationBuckets {
  lt1s: number;
  lt5s: number;
  lt30s: number;
  lt2m: number;
  gte2m: number;
}

/** How many completed runs ended with each outcome in the window. */
export type OutcomeCounts = Record<RunOutcome, number>;

@Injectable()
export class MetricsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  /** Record the start of a new agent run (outcome/endedAt still null). */
  insertStart(row: AgentRunStatsInsert): void {
    this.db.insert(agentRunStats).values(row).run();
  }

  /** Fill in the terminal fields once a run completes. */
  recordEnd(
    id: string,
    endedAt: string,
    durationMs: number,
    outcome: RunOutcome,
  ): void {
    this.db
      .update(agentRunStats)
      .set({ endedAt, durationMs, outcome })
      .where(eq(agentRunStats.id, id))
      .run();
  }

  /**
   * Counts of runs whose `started_at` falls within [from, to], grouped by
   * calendar day (ISO `YYYY-MM-DD` from SQLite's `DATE()` function).
   */
  countByDay(from: string, to: string): RunCountByDay[] {
    const rows = this.db
      .select({
        day: sql<string>`DATE(${agentRunStats.startedAt})`,
        count: count(),
      })
      .from(agentRunStats)
      .where(
        and(
          gte(agentRunStats.startedAt, from),
          lte(agentRunStats.startedAt, to),
        ),
      )
      .groupBy(sql`DATE(${agentRunStats.startedAt})`)
      .orderBy(sql`DATE(${agentRunStats.startedAt})`)
      .all();
    return rows.map((r) => ({ day: r.day, count: r.count }));
  }

  /**
   * Histogram of completed (non-null `duration_ms`) run durations in the window.
   * Buckets: <1 s · 1–5 s · 5–30 s · 30–120 s · ≥120 s.
   */
  durationBuckets(from: string, to: string): DurationBuckets {
    const rows = this.db
      .select({ durationMs: agentRunStats.durationMs })
      .from(agentRunStats)
      .where(
        and(
          gte(agentRunStats.startedAt, from),
          lte(agentRunStats.startedAt, to),
          isNotNull(agentRunStats.durationMs),
        ),
      )
      .all();

    const buckets: DurationBuckets = { lt1s: 0, lt5s: 0, lt30s: 0, lt2m: 0, gte2m: 0 };
    for (const { durationMs } of rows) {
      const ms = durationMs ?? 0;
      if (ms < 1_000) buckets.lt1s++;
      else if (ms < 5_000) buckets.lt5s++;
      else if (ms < 30_000) buckets.lt30s++;
      else if (ms < 120_000) buckets.lt2m++;
      else buckets.gte2m++;
    }
    return buckets;
  }

  /**
   * Count of runs with each terminal outcome in the window. Only counts rows
   * where `outcome` is non-null (i.e., completed runs, not live ones).
   */
  outcomeCounts(from: string, to: string): OutcomeCounts {
    const rows = this.db
      .select({
        outcome: agentRunStats.outcome,
        n: count(),
      })
      .from(agentRunStats)
      .where(
        and(
          gte(agentRunStats.startedAt, from),
          lte(agentRunStats.startedAt, to),
          isNotNull(agentRunStats.outcome),
        ),
      )
      .groupBy(agentRunStats.outcome)
      .all();

    const result: OutcomeCounts = { done: 0, abandoned: 0, failed: 0, cancelled: 0 };
    for (const { outcome, n } of rows) {
      if (outcome && outcome in result) {
        (result as Record<string, number>)[outcome] = n;
      }
    }
    return result;
  }

  // ── Gauge samples (Phase 61 D) ──────────────────────────────────────────────

  /** Persist one gauge sample (the sampler's write path). */
  insertGaugeSample(row: GaugeSampleInsert): void {
    this.db.insert(gaugeSamples).values(row).run();
  }

  /**
   * Sampled gauge series in the optional `[from, to]` window, oldest-first for the
   * charts. Bounded: fetches `limit + 1` newest rows to detect overflow, keeps the
   * newest `limit` when it overflows (so a huge range still returns recent data),
   * and reports `truncated` — no silent cut. Theme E adds rollup-backed long windows.
   */
  gaugeHistory(
    from: string | undefined,
    to: string | undefined,
    limit: number,
  ): { samples: GaugeSampleRow[]; truncated: boolean } {
    const bounds = [
      ...(from ? [gte(gaugeSamples.at, from)] : []),
      ...(to ? [lte(gaugeSamples.at, to)] : []),
    ];
    const rows = this.db
      .select()
      .from(gaugeSamples)
      .where(bounds.length ? and(...bounds) : undefined)
      .orderBy(desc(gaugeSamples.at))
      .limit(limit + 1)
      .all();
    const truncated = rows.length > limit;
    // Keep the newest `limit`, then flip to oldest-first for the chart series.
    const kept = truncated ? rows.slice(0, limit) : rows;
    return { samples: kept.reverse(), truncated };
  }

  /** Delete gauge samples older than `before` (ISO). Returns the deleted count. */
  pruneGaugeSamplesBefore(before: string): number {
    const res = this.db.delete(gaugeSamples).where(lt(gaugeSamples.at, before)).run();
    return res.changes;
  }

  // ── Cycle time (Phase 61 C) ──────────────────────────────────────────────────

  /**
   * Per completed task, the timestamps needed to reconstruct its lifecycle
   * segments, for tasks whose **final `done`** falls in `[from, to]`. Reads the
   * raw `status.changed` event stream (no new columns — Phase 61 C measures
   * first): `firstWipAt = MIN(at)` over `wip` events, `doneAt = MAX(at)` over
   * `done` events, both extracted from the event `data` JSON. A currently-`done`
   * task with no `done` event (e.g. seeded done) yields a null `doneAt` and is
   * dropped by the window predicate — it has no measurable cycle.
   */
  cycleRows(from: string, to: string): DoneTaskCycleRow[] {
    const statusExpr = sql`json_extract(${taskEvents.data}, '$.status')`;
    const firstWipAt = sql<string | null>`MIN(CASE WHEN ${statusExpr} = 'wip' THEN ${taskEvents.at} END)`;
    const doneAt = sql`MAX(CASE WHEN ${statusExpr} = 'done' THEN ${taskEvents.at} END)`;

    const rows = this.db
      .select({
        id: tasks.id,
        repo: tasks.repo,
        projectId: tasks.projectId,
        priority: tasks.priority,
        createdAt: tasks.createdAt,
        firstWipAt,
        doneAt: doneAt.as('done_at'),
      })
      .from(tasks)
      .innerJoin(
        taskEvents,
        and(eq(taskEvents.taskId, tasks.id), eq(taskEvents.kind, 'status.changed')),
      )
      .where(eq(tasks.status, 'done'))
      .groupBy(tasks.id)
      .having(sql`${doneAt} >= ${from} AND ${doneAt} <= ${to}`)
      .all();

    return rows.map((r) => ({
      id: r.id,
      repo: r.repo,
      projectId: r.projectId,
      priority: r.priority,
      createdAt: r.createdAt,
      firstWipAt: r.firstWipAt,
      // Non-null by the HAVING predicate; assert for the type.
      doneAt: r.doneAt as string,
    }));
  }

  /**
   * Retry overhead per task: summed `duration_ms` and attempt count over
   * `agent_run_stats` rows with `retry_count > 0` (i.e. re-spawned attempts, not
   * the first run) and a recorded duration. Not windowed — a task's retries may
   * predate its `done`; the service picks the tasks it cares about.
   */
  retryOverheadByTask(): Map<string, RetryOverhead> {
    const rows = this.db
      .select({
        taskId: agentRunStats.taskId,
        totalMs: sql<number>`COALESCE(SUM(${agentRunStats.durationMs}), 0)`,
        attempts: count(),
      })
      .from(agentRunStats)
      .where(and(gt(agentRunStats.retryCount, 0), isNotNull(agentRunStats.durationMs)))
      .groupBy(agentRunStats.taskId)
      .all();

    const map = new Map<string, RetryOverhead>();
    for (const r of rows) {
      map.set(r.taskId, { retryOverheadMs: r.totalMs, retryAttempts: r.attempts });
    }
    return map;
  }
}

/** Raw per-task timestamps for cycle-time reconstruction (Phase 61 C). */
export interface DoneTaskCycleRow {
  id: string;
  repo: string | null;
  projectId: string | null;
  priority: number;
  createdAt: string;
  /** First entry into `wip`; null when the task went straight to `done`. */
  firstWipAt: string | null;
  /** Final `done` timestamp (guaranteed non-null within the window). */
  doneAt: string;
}

/** Retry cost for one task, from `agent_run_stats` (Phase 61 C). */
export interface RetryOverhead {
  retryOverheadMs: number;
  retryAttempts: number;
}

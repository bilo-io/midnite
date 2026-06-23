import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';

import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { agentRunStats, type AgentRunStatsInsert } from '../db/schema';

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
}

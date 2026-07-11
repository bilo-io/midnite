import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';

import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  agentRunStats,
  taskCheckRuns,
  taskEvents,
  taskFailures,
  taskRetros,
  type AgentRunStatsRow,
  type TaskCheckRunRow,
  type TaskEventRow,
  type TaskFailureRow,
  type TaskRetroInsert,
  type TaskRetroRow,
} from '../db/schema';

/**
 * Drizzle-only data access for retrospectives (Phase 62 A). Reads the raw
 * material — task events / run stats / failures / check runs for one task — that
 * {@link RetroBuilderService} assembles into a skeleton, and upserts the one
 * `task_retros` row per task.
 */
@Injectable()
export class RetroRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  events(taskId: string): TaskEventRow[] {
    return this.db.select().from(taskEvents).where(eq(taskEvents.taskId, taskId)).orderBy(asc(taskEvents.at)).all();
  }

  runStats(taskId: string): AgentRunStatsRow[] {
    return this.db
      .select()
      .from(agentRunStats)
      .where(eq(agentRunStats.taskId, taskId))
      .orderBy(asc(agentRunStats.startedAt))
      .all();
  }

  failures(taskId: string): TaskFailureRow[] {
    return this.db.select().from(taskFailures).where(eq(taskFailures.taskId, taskId)).orderBy(asc(taskFailures.at)).all();
  }

  checkRuns(taskId: string): TaskCheckRunRow[] {
    return this.db
      .select()
      .from(taskCheckRuns)
      .where(eq(taskCheckRuns.taskId, taskId))
      .orderBy(asc(taskCheckRuns.startedAt))
      .all();
  }

  getByTaskId(taskId: string): TaskRetroRow | undefined {
    return this.db.select().from(taskRetros).where(eq(taskRetros.taskId, taskId)).get();
  }

  /** Every stored retro row (newest-first) — for the search backfill (Phase 62 G). */
  listAll(): TaskRetroRow[] {
    return this.db.select().from(taskRetros).orderBy(desc(taskRetros.createdAt)).all();
  }

  /** Insert or (on re-terminal) update the single retro row for a task. */
  upsert(row: TaskRetroInsert): TaskRetroRow {
    return this.db
      .insert(taskRetros)
      .values(row)
      .onConflictDoUpdate({
        target: taskRetros.taskId,
        set: {
          outcome: row.outcome,
          hasNarrative: row.hasNarrative,
          retro: row.retro,
          updatedAt: row.updatedAt,
        },
      })
      .returning()
      .get();
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { TaskFailure } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { taskFailures, type TaskFailureInsert, type TaskFailureRow } from '../db/schema';

/**
 * Phase 53 Theme A — persistence for the `task_failures` log. Drizzle only; the
 * service owns when to record. Rows map 1:1 to the shared {@link TaskFailure}.
 */
@Injectable()
export class TaskFailuresRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: TaskFailureInsert): void {
    this.db.insert(taskFailures).values(row).run();
  }

  /** A task's failure history, oldest-first (retry timeline order). */
  listByTask(taskId: string): TaskFailure[] {
    return this.db
      .select()
      .from(taskFailures)
      .where(eq(taskFailures.taskId, taskId))
      .orderBy(asc(taskFailures.at))
      .all()
      .map(toTaskFailure);
  }
}

export function toTaskFailure(row: TaskFailureRow): TaskFailure {
  return {
    id: row.id,
    taskId: row.taskId,
    class: row.class as TaskFailure['class'],
    detail: row.detail,
    exitCode: row.exitCode ?? undefined,
    lastOutput: row.lastOutput,
    retryIndex: row.retryIndex,
    teamId: row.teamId ?? undefined,
    at: row.at,
  };
}

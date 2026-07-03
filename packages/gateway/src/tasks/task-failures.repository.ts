import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, type SQL } from 'drizzle-orm';
import type { FailureClass, TaskFailure } from '@midnite/shared';
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

  /**
   * Recent failures across tasks, newest-first (Phase 53 E) — for the health view
   * + `midnite tasks failures`. Optionally narrowed to one `class` and scoped to a
   * `teamId` (undefined ⇒ no team filter: the local/single-user path). `teamId` is
   * the tenant boundary here; `task_failures` has no `createdBy`, so per-user
   * isolation within a team isn't enforced for this read-only ops view.
   */
  listRecent(opts: { teamId?: string; class?: FailureClass; limit: number }): TaskFailure[] {
    const conds: SQL[] = [];
    if (opts.teamId !== undefined) conds.push(eq(taskFailures.teamId, opts.teamId));
    if (opts.class) conds.push(eq(taskFailures.class, opts.class));
    return this.db
      .select()
      .from(taskFailures)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(taskFailures.at))
      .limit(opts.limit)
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

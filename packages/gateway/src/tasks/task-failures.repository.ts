import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, type SQL } from 'drizzle-orm';
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
   * + `midnite failures`. Optionally narrowed to one `class`.
   *
   * Visibility is scoped by `taskIds` — **the set of tasks the caller can see**
   * (the service passes `TasksService.listTasks(scope)` ids), so failure
   * visibility exactly matches task visibility. `task_failures` has no `createdBy`
   * of its own, so scoping by team id alone would both leak (an authed user with
   * no team) and under-report (a user's own personal-task failures) — the task-id
   * set avoids both. `taskIds` undefined ⇒ no scope (the local/single-user path);
   * an **empty** array ⇒ no visible tasks ⇒ no rows.
   */
  listRecent(opts: { taskIds?: string[]; class?: FailureClass; limit: number }): TaskFailure[] {
    if (opts.taskIds && opts.taskIds.length === 0) return [];
    const conds: SQL[] = [];
    if (opts.taskIds) conds.push(inArray(taskFailures.taskId, opts.taskIds));
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

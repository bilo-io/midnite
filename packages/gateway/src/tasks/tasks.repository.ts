import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNotNull, notInArray, or, sql } from 'drizzle-orm';
import {
  detectSourceKind,
  type CheckResult,
  type CheckRun,
  type CheckRunStatus,
  type CheckTrigger,
  type PrStatus,
  type Status,
  type Task,
  type TaskAttachment,
  type TaskEvent,
  type TaskLink,
} from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  prStatus,
  taskAttachments,
  taskCheckRuns,
  taskDependencies,
  taskEvents,
  taskLinks,
  tasks,
  type PrStatusInsert,
  type PrStatusRow,
  type TaskAttachmentInsert,
  type TaskCheckRunInsert,
  type TaskEventInsert,
  type TaskLinkInsert,
  type TaskInsert,
  type TaskRow,
} from '../db/schema';

function checkRunRowToCheckRun(row: {
  id: string;
  taskId: string;
  trigger: string;
  passed: number;
  startedAt: string;
  finishedAt: string;
  results: string;
}): CheckRun {
  return {
    id: row.id,
    taskId: row.taskId,
    trigger: row.trigger as CheckTrigger,
    passed: row.passed === 1,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    results: JSON.parse(row.results) as CheckResult[],
  };
}

/** Parse the JSON-array `tags` column to a string[]; tolerant of null/legacy/garbage. */
function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

@Injectable()
export class TasksRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insertTask(row: TaskInsert): TaskRow {
    return this.db.insert(tasks).values(row).returning().get();
  }

  insertEvent(row: TaskEventInsert): void {
    this.db.insert(taskEvents).values(row).run();
  }

  insertAttachment(row: TaskAttachmentInsert): void {
    this.db.insert(taskAttachments).values(row).run();
  }

  updateStatus(id: string, status: Status, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ status, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setSession(id: string, sessionId: string | null, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ sessionId, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setPrUrl(id: string, prUrl: string, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ prUrl, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Bump the retry counter (used when an agent session crashes and is re-queued).
  incrementRetry(id: string, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ retryCount: sql`${tasks.retryCount} + 1`, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setProject(id: string, projectId: string | null, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ projectId, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setTags(id: string, tags: string[], updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ tags: JSON.stringify(tags), updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setArchived(id: string, archivedAt: string | null, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ archivedAt, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Deleting a task removes its event log, attachments, links and dependency
  // edges too. Edges are cleared in *both* directions: as a dependent (its own
  // blockers) and as a blocker (whatever depended on it — those become unblocked).
  // Wrapped in a transaction so the writes are atomic.
  deleteTask(id: string): void {
    this.db.transaction((tx) => {
      tx.delete(taskLinks).where(eq(taskLinks.taskId, id)).run();
      tx.delete(taskAttachments).where(eq(taskAttachments.taskId, id)).run();
      tx.delete(taskEvents).where(eq(taskEvents.taskId, id)).run();
      tx.delete(taskDependencies)
        .where(
          or(eq(taskDependencies.taskId, id), eq(taskDependencies.dependsOnTaskId, id)),
        )
        .run();
      tx.delete(prStatus).where(eq(prStatus.taskId, id)).run();
      tx.delete(tasks).where(eq(tasks.id, id)).run();
    });
  }

  listTasks(status?: Status, projectId?: string): TaskRow[] {
    const where = and(
      status ? eq(tasks.status, status) : undefined,
      projectId ? eq(tasks.projectId, projectId) : undefined,
    );
    // Highest priority first, then oldest within a priority — this drives the
    // scheduler's todo selection and the board's within-column order.
    return this.db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(desc(tasks.priority), asc(tasks.createdAt))
      .all();
  }

  getTask(id: string): TaskRow | undefined {
    return this.db.select().from(tasks).where(eq(tasks.id, id)).get();
  }

  listEvents(taskId: string): TaskEvent[] {
    const rows = this.db
      .select()
      .from(taskEvents)
      .where(eq(taskEvents.taskId, taskId))
      .orderBy(asc(taskEvents.at))
      .all();
    return rows.map((r) => ({
      at: r.at,
      kind: r.kind,
      data: r.data ? (JSON.parse(r.data) as Record<string, unknown>) : undefined,
    }));
  }

  listAttachments(taskId: string): TaskAttachment[] {
    const rows = this.db
      .select()
      .from(taskAttachments)
      .where(eq(taskAttachments.taskId, taskId))
      .orderBy(asc(taskAttachments.createdAt))
      .all();
    return rows.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      path: r.path,
      mime: r.mime,
      size: r.size,
      originalName: r.originalName ?? undefined,
      createdAt: r.createdAt,
    }));
  }

  insertLink(row: TaskLinkInsert): void {
    this.db.insert(taskLinks).values(row).run();
  }

  listLinks(taskId: string): TaskLink[] {
    const rows = this.db
      .select()
      .from(taskLinks)
      .where(eq(taskLinks.taskId, taskId))
      .orderBy(asc(taskLinks.createdAt))
      .all();
    return rows.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      url: r.url,
      kind: r.kind as TaskLink['kind'],
      label: r.label ?? undefined,
      createdAt: r.createdAt,
    }));
  }

  getLink(taskId: string, linkId: string): TaskLink | undefined {
    return this.listLinks(taskId).find((l) => l.id === linkId);
  }

  deleteLink(taskId: string, linkId: string): void {
    this.db
      .delete(taskLinks)
      .where(and(eq(taskLinks.id, linkId), eq(taskLinks.taskId, taskId)))
      .run();
  }

  // ---- dependency edges (Phase 27) ----

  /** Add a blocker edge `taskId → dependsOnTaskId`; a duplicate pair is a no-op. */
  addDependency(taskId: string, dependsOnTaskId: string, createdAt: string): void {
    this.db
      .insert(taskDependencies)
      .values({ taskId, dependsOnTaskId, createdAt })
      .onConflictDoNothing()
      .run();
  }

  removeDependency(taskId: string, dependsOnTaskId: string): void {
    this.db
      .delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.taskId, taskId),
          eq(taskDependencies.dependsOnTaskId, dependsOnTaskId),
        ),
      )
      .run();
  }

  /** Ids of the tasks that block `taskId` (its blockers). */
  dependenciesOf(taskId: string): string[] {
    return this.db
      .select({ id: taskDependencies.dependsOnTaskId })
      .from(taskDependencies)
      .where(eq(taskDependencies.taskId, taskId))
      .all()
      .map((r) => r.id);
  }

  /** Ids of the tasks that `taskId` blocks (its dependents). */
  dependentsOf(taskId: string): string[] {
    return this.db
      .select({ id: taskDependencies.taskId })
      .from(taskDependencies)
      .where(eq(taskDependencies.dependsOnTaskId, taskId))
      .all()
      .map((r) => r.id);
  }

  /**
   * `todo` tasks that are *ready* — every blocker is `done` (or has none) —
   * keeping the scheduler's `desc(priority), asc(createdAt)` ordering. Readiness
   * is evaluated in SQL (a correlated `NOT EXISTS` over unmet blockers) so the
   * tick stays cheap at scale. Backs the Theme B scheduler.
   */
  listReadyTodoTasks(): TaskRow[] {
    return this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'todo'),
          sql`NOT EXISTS (
            SELECT 1 FROM task_dependencies d
            JOIN tasks b ON b.id = d.depends_on_task_id
            WHERE d.task_id = tasks.id AND b.status != 'done'
          )`,
        ),
      )
      .orderBy(desc(tasks.priority), asc(tasks.createdAt))
      .all();
  }

  // ---- PR status (Phase 22 Theme C) ----

  getPrStatusRow(taskId: string): PrStatusRow | undefined {
    return this.db.select().from(prStatus).where(eq(prStatus.taskId, taskId)).get();
  }

  /** Insert or replace the PR status for a task (keyed by `taskId`). */
  upsertPrStatus(row: PrStatusInsert): void {
    this.db
      .insert(prStatus)
      .values(row)
      .onConflictDoUpdate({
        target: prStatus.taskId,
        set: {
          url: row.url,
          number: row.number,
          state: row.state,
          checks: row.checks,
          reviewDecision: row.reviewDecision ?? null,
          fetchedAt: row.fetchedAt,
        },
      })
      .run();
  }

  /**
   * Tasks the poller should refresh: those with a PR URL whose last-known status
   * isn't terminal (merged/closed). A task with a URL but no status row yet is
   * included (never fetched). Terminal rows are excluded so a settled PR stops
   * being polled. Highest-priority/oldest first, matching the board order.
   */
  listTasksWithUnmergedPr(): TaskRow[] {
    const terminal = this.db
      .select({ id: prStatus.taskId })
      .from(prStatus)
      .where(inArray(prStatus.state, ['merged', 'closed']));
    return this.db
      .select()
      .from(tasks)
      .where(and(isNotNull(tasks.prUrl), notInArray(tasks.id, terminal)))
      .orderBy(desc(tasks.priority), asc(tasks.createdAt))
      .all();
  }

  countsByStatus(): Record<Status, number> {
    const result: Record<Status, number> = {
      backlog: 0,
      todo: 0,
      wip: 0,
      waiting: 0,
      done: 0,
      abandoned: 0,
    };
    const rows = this.db
      .select({ status: tasks.status, count: sql<number>`COUNT(*)` })
      .from(tasks)
      .groupBy(tasks.status)
      .all();
    for (const row of rows) {
      if (row.status in result) {
        result[row.status as Status] = Number(row.count);
      }
    }
    return result;
  }

  hydrate(row: TaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      kind: row.kind as Task['kind'],
      status: row.status as Status,
      priority: row.priority,
      retryCount: row.retryCount,
      prompt: row.prompt ?? undefined,
      repo: row.repo ?? undefined,
      agentId: row.agentId ?? undefined,
      sessionId: row.sessionId ?? undefined,
      projectId: row.projectId ?? undefined,
      prUrl: row.prUrl ?? undefined,
      prStatus: this.toPrStatus(this.getPrStatusRow(row.id)),
      tags: parseTags(row.tags),
      dependsOn: this.dependenciesOf(row.id),
      checkRunStatus: this.deriveCheckRunStatus(row.id),
      archivedAt: row.archivedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      events: this.listEvents(row.id),
      attachments: this.listAttachments(row.id),
      links: this.resolveLinks(row),
    };
  }

  private deriveCheckRunStatus(taskId: string): CheckRunStatus | undefined {
    const run = this.latestCheckRunForTask(taskId);
    if (!run) return undefined;
    return run.passed ? 'passed' : 'failing';
  }

  // Map a persisted pr_status row to the shared PrStatus shape (the text columns
  // are app-validated enums; cast on read). Undefined when no row exists yet.
  private toPrStatus(row: PrStatusRow | undefined): PrStatus | undefined {
    if (!row) return undefined;
    return {
      state: row.state as PrStatus['state'],
      checks: row.checks as PrStatus['checks'],
      reviewDecision: (row.reviewDecision as PrStatus['reviewDecision']) ?? undefined,
      url: row.url,
      number: row.number,
      fetchedAt: row.fetchedAt,
    };
  }

  // Surface a legacy single prUrl as a link until it's migrated to task_links.
  private resolveLinks(row: TaskRow): TaskLink[] {
    const links = this.listLinks(row.id);
    if (links.length === 0 && row.prUrl) {
      links.push({
        id: `legacy-${row.id}`,
        taskId: row.id,
        url: row.prUrl,
        kind: detectSourceKind(row.prUrl),
        createdAt: row.createdAt,
      });
    }
    return links;
  }

  // ── Check-run history (Phase 30 B1) ────────────────────────────────────────

  insertCheckRun(row: TaskCheckRunInsert): void {
    this.db.insert(taskCheckRuns).values(row).run();
  }

  checkRunsForTask(taskId: string): CheckRun[] {
    return this.db
      .select()
      .from(taskCheckRuns)
      .where(eq(taskCheckRuns.taskId, taskId))
      .orderBy(asc(taskCheckRuns.startedAt))
      .all()
      .map(checkRunRowToCheckRun);
  }

  latestCheckRunForTask(taskId: string): CheckRun | null {
    const row = this.db
      .select()
      .from(taskCheckRuns)
      .where(eq(taskCheckRuns.taskId, taskId))
      .orderBy(desc(taskCheckRuns.startedAt))
      .limit(1)
      .all()[0];
    return row ? checkRunRowToCheckRun(row) : null;
  }
}

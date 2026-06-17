import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import {
  detectSourceKind,
  type Status,
  type Task,
  type TaskAttachment,
  type TaskEvent,
  type TaskLink,
} from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  taskAttachments,
  taskEvents,
  taskLinks,
  tasks,
  type TaskAttachmentInsert,
  type TaskEventInsert,
  type TaskLinkInsert,
  type TaskInsert,
  type TaskRow,
} from '../db/schema';

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

  setArchived(id: string, archivedAt: string | null, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ archivedAt, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Deleting a task removes its event log, attachments and links too. Wrapped in
  // a transaction so the four writes are atomic.
  deleteTask(id: string): void {
    this.db.transaction((tx) => {
      tx.delete(taskLinks).where(eq(taskLinks.taskId, id)).run();
      tx.delete(taskAttachments).where(eq(taskAttachments.taskId, id)).run();
      tx.delete(taskEvents).where(eq(taskEvents.taskId, id)).run();
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
      archivedAt: row.archivedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      events: this.listEvents(row.id),
      attachments: this.listAttachments(row.id),
      links: this.resolveLinks(row),
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
}

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Status, Task, TaskAttachment, TaskEvent } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  taskAttachments,
  taskEvents,
  tasks,
  type TaskAttachmentInsert,
  type TaskEventInsert,
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

  listTasks(status?: Status, projectId?: string): TaskRow[] {
    const where = and(
      status ? eq(tasks.status, status) : undefined,
      projectId ? eq(tasks.projectId, projectId) : undefined,
    );
    return this.db.select().from(tasks).where(where).orderBy(asc(tasks.createdAt)).all();
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
      prompt: row.prompt ?? undefined,
      repo: row.repo ?? undefined,
      agentId: row.agentId ?? undefined,
      sessionId: row.sessionId ?? undefined,
      projectId: row.projectId ?? undefined,
      prUrl: row.prUrl ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      events: this.listEvents(row.id),
      attachments: this.listAttachments(row.id),
    };
  }
}

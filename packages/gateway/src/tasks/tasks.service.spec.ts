import { describe, expect, it } from 'vitest';
import type { Status, Task, TaskAttachment, TaskEvent } from '@midnite/shared';
import type {
  TaskAttachmentInsert,
  TaskEventInsert,
  TaskInsert,
  TaskRow,
} from '../db/schema';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';

class StubClassifier extends TaskClassifier {
  async classify(prompt: string, _images: ClassifierImage[]) {
    return { title: prompt.slice(0, 40), kind: 'feature' as const };
  }
}

class InMemoryRepo extends TasksRepository {
  readonly tasks: TaskRow[] = [];
  readonly events: TaskEventInsert[] = [];
  readonly attachments: TaskAttachmentInsert[] = [];

  constructor() {
    super({} as never);
  }

  override insertTask(row: TaskInsert): TaskRow {
    const full: TaskRow = {
      id: row.id,
      title: row.title,
      kind: row.kind ?? 'unknown',
      status: row.status ?? 'todo',
      prompt: row.prompt ?? null,
      repo: row.repo ?? null,
      agentId: row.agentId ?? null,
      sessionId: row.sessionId ?? null,
      prUrl: row.prUrl ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    this.tasks.push(full);
    return full;
  }

  override insertEvent(row: TaskEventInsert): void {
    this.events.push(row);
  }

  override insertAttachment(row: TaskAttachmentInsert): void {
    this.attachments.push(row);
  }

  override updateStatus(id: string, status: Status, updatedAt: string): TaskRow | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.status = status;
    task.updatedAt = updatedAt;
    return task;
  }

  override listTasks(status?: Status): TaskRow[] {
    return status ? this.tasks.filter((t) => t.status === status) : [...this.tasks];
  }

  override getTask(id: string): TaskRow | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  override listEvents(taskId: string): TaskEvent[] {
    return this.events
      .filter((e) => e.taskId === taskId)
      .map((e) => ({
        at: e.at,
        kind: e.kind,
        data: e.data ? (JSON.parse(e.data) as Record<string, unknown>) : undefined,
      }));
  }

  override listAttachments(taskId: string): TaskAttachment[] {
    return this.attachments
      .filter((a) => a.taskId === taskId)
      .map((a) => ({
        id: a.id,
        taskId: a.taskId,
        path: a.path,
        mime: a.mime,
        size: a.size,
        originalName: a.originalName ?? undefined,
        createdAt: a.createdAt,
      }));
  }

  override countsByStatus(): Record<Status, number> {
    const result: Record<Status, number> = {
      backlog: 0, todo: 0, wip: 0, waiting: 0, done: 0, abandoned: 0,
    };
    for (const t of this.tasks) result[t.status as Status]++;
    return result;
  }

  override hydrate(row: TaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      kind: row.kind as Task['kind'],
      status: row.status as Status,
      prompt: row.prompt ?? undefined,
      repo: row.repo ?? undefined,
      agentId: row.agentId ?? undefined,
      sessionId: row.sessionId ?? undefined,
      prUrl: row.prUrl ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      events: this.listEvents(row.id),
      attachments: this.listAttachments(row.id),
    };
  }
}

function seed(repo: InMemoryRepo, statuses: Status[]) {
  for (const [i, status] of statuses.entries()) {
    repo.insertTask({
      id: `t${i}`,
      title: `task ${i}`,
      kind: 'unknown',
      status,
      createdAt: new Date(2026, 0, i + 1).toISOString(),
      updatedAt: new Date(2026, 0, i + 1).toISOString(),
    });
  }
}

describe('TasksService', () => {
  it('maps 6 raw statuses into 4 dashboard buckets, excluding abandoned', () => {
    const repo = new InMemoryRepo();
    seed(repo, [
      'backlog', 'backlog',
      'todo', 'todo', 'todo',
      'wip',
      'waiting',
      'done', 'done',
      'abandoned',
    ]);
    const service = new TasksService(repo, new StubClassifier());
    const counts = service.getCounts();
    // backlog and todo are now distinct buckets; wip + waiting fold into
    // inProgress; abandoned is excluded from the dashboard entirely.
    expect(counts).toEqual({ backlog: 2, todo: 3, inProgress: 2, done: 2 });
  });

  it('createFromPrompt persists task, classifies, and emits task.created event', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, new StubClassifier());

    const task = await service.createFromPrompt({
      prompt: 'add a CSV export to the reports page',
      images: [],
    });

    expect(task.status).toBe('todo');
    expect(task.kind).toBe('feature');
    expect(task.title).toBe('add a CSV export to the reports page');
    expect(task.events.map((e) => e.kind)).toContain('task.created');
    expect(repo.tasks).toHaveLength(1);
  });

  it('createFromPrompt records attachments against the new task', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, new StubClassifier());

    const task = await service.createFromPrompt({
      prompt: 'fix layout',
      images: [
        { path: 'abc/one.png', mime: 'image/png', size: 1234, originalName: 'one.png' },
      ],
    });

    expect(repo.attachments).toHaveLength(1);
    expect(repo.attachments[0]!.taskId).toBe(task.id);
    expect(task.attachments?.[0]?.path).toBe('abc/one.png');
  });

  it('updateStatus changes status and emits status.changed event', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['todo']);
    const service = new TasksService(repo, new StubClassifier());
    const updated = service.updateStatus('t0', 'wip');
    expect(updated.status).toBe('wip');
    expect(repo.events.some((e) => e.kind === 'status.changed')).toBe(true);
  });
});

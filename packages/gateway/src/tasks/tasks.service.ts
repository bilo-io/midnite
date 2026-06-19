import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  detectSourceKind,
  MAX_TAGS_PER_TASK,
  MAX_TASK_TAG_LENGTH,
  type Status,
  type Task,
  type TaskCounts,
} from '@midnite/shared';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import { PlannerService } from '../agent/planner.service';
import { TasksRepository } from './tasks.repository';
import { TaskEventBus } from './task-event-bus';

/** Clamp a caller-supplied priority into 0..3, defaulting to 1 (Normal). */
function clampPriority(p: number | undefined): number {
  if (p === undefined || !Number.isFinite(p)) return 1;
  return Math.min(3, Math.max(0, Math.trunc(p)));
}

/** Normalise a tag set: trim, drop empties, length-cap each, de-dupe (case-insensitive), cap count. */
function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().slice(0, MAX_TASK_TAG_LENGTH);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAGS_PER_TASK) break;
  }
  return out;
}

export interface CreateTaskInput {
  prompt: string;
  repo?: string;
  projectId?: string;
  /** Where the task should land. Defaults to 'todo' (picked up as agents free up). */
  status?: Status;
  /** Scheduling priority 0..3 (higher runs first). Defaults to 1 (Normal). */
  priority?: number;
  images: Array<ClassifierImage & { size: number; originalName?: string }>;
}

@Injectable()
export class TasksService {
  constructor(
    @Inject(TasksRepository) private readonly repo: TasksRepository,
    @Inject(TaskClassifier) private readonly classifier: TaskClassifier,
    @Inject(PlannerService) private readonly planner: PlannerService,
    @Inject(TaskEventBus) private readonly bus: TaskEventBus,
  ) {}

  // Publish a board event after a mutation. `created`/`updated` carry the full
  // task so clients can patch their cache; the web client just invalidates and
  // refetches. Returns the task so call sites read `return this.emit(...)`.
  private emit(type: 'task.created' | 'task.updated', task: Task): Task {
    this.bus.emit({ type, at: new Date().toISOString(), task });
    return task;
  }

  getCounts(): TaskCounts {
    const raw = this.repo.countsByStatus();
    return {
      backlog: raw.backlog,
      todo: raw.todo,
      inProgress: raw.wip + raw.waiting,
      done: raw.done,
    };
  }

  listTasks(status?: Status, projectId?: string): Task[] {
    return this.repo.listTasks(status, projectId).map((r) => this.repo.hydrate(r));
  }

  getTask(id: string): Task {
    const row = this.repo.getTask(id);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    return this.repo.hydrate(row);
  }

  updateStatus(id: string, status: Status): Task {
    const now = new Date().toISOString();
    const row = this.repo.updateStatus(id, status, now);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'status.changed',
      data: JSON.stringify({ status }),
    });
    // Abandoning a task archives its session too. Idempotent: don't disturb an
    // existing archive timestamp, and don't auto-unarchive when moving back out.
    if (status === 'abandoned' && !row.archivedAt) {
      this.repo.setArchived(id, now, now);
      this.repo.insertEvent({
        id: randomUUID(),
        taskId: id,
        at: now,
        kind: 'task.archived',
        data: JSON.stringify({ reason: 'abandoned' }),
      });
    }
    return this.emit('task.updated', this.getTask(id));
  }

  // ---- agent pool lifecycle transitions ----
  // Driven by the scheduler/runner and the Stop/Notification hooks. Each is
  // idempotent on its target status so a hook firing twice (or racing the PTY's
  // onExit) can't double-transition or clobber a later state.

  /** Claim a task for an agent run: → wip, bind its session id (== task id). */
  startTask(id: string): Task {
    const now = new Date().toISOString();
    if (!this.repo.getTask(id)) throw new NotFoundException(`task ${id} not found`);
    this.repo.updateStatus(id, 'wip', now);
    this.repo.setSession(id, id, now);
    this.repo.insertEvent({ id: randomUUID(), taskId: id, at: now, kind: 'agent.started' });
    return this.emit('task.updated', this.getTask(id));
  }

  /** Return a task to the queue (PTY died / restart reconciliation / user stop):
   *  → todo by default, or backlog. Clears the bound session so it reads as idle. */
  requeue(id: string, target: 'todo' | 'backlog' = 'todo'): Task {
    const now = new Date().toISOString();
    if (!this.repo.getTask(id)) throw new NotFoundException(`task ${id} not found`);
    this.repo.updateStatus(id, target, now);
    this.repo.setSession(id, null, now);
    this.repo.insertEvent({ id: randomUUID(), taskId: id, at: now, kind: 'agent.requeued' });
    return this.emit('task.updated', this.getTask(id));
  }

  /** Crash retry: bump the retry counter, then → todo (clearing the session).
   *  Distinct from {@link requeue} (a transient/restart return that doesn't
   *  count against the retry budget). */
  retry(id: string): Task {
    const now = new Date().toISOString();
    if (!this.repo.getTask(id)) throw new NotFoundException(`task ${id} not found`);
    this.repo.incrementRetry(id, now);
    this.repo.updateStatus(id, 'todo', now);
    this.repo.setSession(id, null, now);
    const retryCount = this.repo.getTask(id)?.retryCount ?? 0;
    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'agent.retried',
      data: JSON.stringify({ retryCount }),
    });
    return this.emit('task.updated', this.getTask(id));
  }

  /** Agent blocked on user input (Notification hook): → waiting. Idempotent. */
  markWaiting(id: string): Task {
    const now = new Date().toISOString();
    const row = this.repo.getTask(id);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    if (row.status === 'waiting') return this.getTask(id);
    this.repo.updateStatus(id, 'waiting', now);
    this.repo.insertEvent({ id: randomUUID(), taskId: id, at: now, kind: 'agent.waiting' });
    return this.emit('task.updated', this.getTask(id));
  }

  /** Agent finished (Stop hook): → done, optionally recording a PR URL. Idempotent. */
  markDone(id: string, prUrl?: string): Task {
    const now = new Date().toISOString();
    const row = this.repo.getTask(id);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    if (row.status === 'done') return this.getTask(id);
    this.repo.updateStatus(id, 'done', now);
    if (prUrl) this.repo.setPrUrl(id, prUrl, now);
    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'agent.done',
      ...(prUrl ? { data: JSON.stringify({ prUrl }) } : {}),
    });
    return this.emit('task.updated', this.getTask(id));
  }

  archive(id: string): Task {
    const now = new Date().toISOString();
    const row = this.repo.setArchived(id, now, now);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'task.archived',
      data: JSON.stringify({ reason: 'manual' }),
    });
    return this.emit('task.updated', this.repo.hydrate(row));
  }

  unarchive(id: string): Task {
    const now = new Date().toISOString();
    const row = this.repo.setArchived(id, null, now);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'task.unarchived',
    });
    return this.emit('task.updated', this.repo.hydrate(row));
  }

  // Permanent deletion is gated on the task being archived first — the archive is
  // the recoverable holding state; delete is the irreversible step past it.
  deleteTask(id: string): void {
    const row = this.repo.getTask(id);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    if (!row.archivedAt) {
      throw new BadRequestException('task must be archived before it can be deleted');
    }
    this.repo.deleteTask(id);
    this.bus.emit({ type: 'task.deleted', at: new Date().toISOString(), id });
  }

  async createFromPrompt(input: CreateTaskInput): Promise<Task> {
    // Triage (plan model: ready→todo / not→backlog) and classify (title/kind)
    // run concurrently — both are fail-soft, so neither breaks task creation.
    const [classified, triage] = await Promise.all([
      this.classifier.classify(
        input.prompt,
        input.images.map((i) => ({ path: i.path, mime: i.mime })),
      ),
      this.planner.triage(input.prompt),
    ]);

    const id = randomUUID();
    const now = new Date().toISOString();

    this.repo.insertTask({
      id,
      title: classified.title,
      kind: classified.kind,
      // An explicit caller status wins; otherwise the planner's triage decides
      // the landing column.
      status: input.status ?? (triage.ready ? 'todo' : 'backlog'),
      priority: clampPriority(input.priority),
      prompt: input.prompt,
      repo: input.repo ?? null,
      projectId: input.projectId ?? null,
      agentId: null,
      sessionId: null,
      prUrl: null,
      createdAt: now,
      updatedAt: now,
    });

    for (const image of input.images) {
      this.repo.insertAttachment({
        id: randomUUID(),
        taskId: id,
        path: image.path,
        mime: image.mime,
        size: image.size,
        originalName: image.originalName ?? null,
        createdAt: now,
      });
    }

    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'task.created',
      data: JSON.stringify({
        promptLength: input.prompt.length,
        attachments: input.images.length,
      }),
    });

    return this.emit('task.created', this.getTask(id));
  }

  // Create a task directly from a plan checklist item: explicit title, tagged to
  // the project, no AI classification (deterministic and cheap).
  createForProject(input: { projectId: string; title: string }): Task {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.repo.insertTask({
      id,
      title: input.title,
      kind: 'unknown',
      status: 'todo',
      prompt: null,
      repo: null,
      agentId: null,
      sessionId: null,
      projectId: input.projectId,
      prUrl: null,
      createdAt: now,
      updatedAt: now,
    });

    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'task.created',
      data: JSON.stringify({ projectId: input.projectId, source: 'plan' }),
    });

    return this.emit('task.created', this.getTask(id));
  }

  // Reassign a task to a project (or clear it with null). The projectId isn't
  // validated against projects here — domains don't share FKs, and the UI only
  // offers existing projects; an unknown id simply renders no tag.
  setProject(id: string, projectId: string | null): Task {
    const now = new Date().toISOString();
    const row = this.repo.setProject(id, projectId, now);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'task.project.changed',
      data: JSON.stringify({ projectId }),
    });
    return this.emit('task.updated', this.getTask(id));
  }

  // Replace a task's tag set (normalised: trimmed, de-duped, length/count-capped).
  setTags(id: string, tags: string[]): Task {
    const now = new Date().toISOString();
    const normalized = normalizeTags(tags);
    const row = this.repo.setTags(id, normalized, now);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'task.tags.changed',
      data: JSON.stringify({ tags: normalized }),
    });
    return this.emit('task.updated', this.getTask(id));
  }

  addLink(taskId: string, url: string, label?: string): Task {
    this.getTask(taskId); // 404s if the task is missing
    const now = new Date().toISOString();
    this.repo.insertLink({
      id: randomUUID(),
      taskId,
      url,
      kind: detectSourceKind(url),
      label: label ?? null,
      createdAt: now,
    });
    this.repo.insertEvent({
      id: randomUUID(),
      taskId,
      at: now,
      kind: 'link.added',
      data: JSON.stringify({ url }),
    });
    return this.emit('task.updated', this.getTask(taskId));
  }

  removeLink(taskId: string, linkId: string): Task {
    this.getTask(taskId);
    if (!this.repo.getLink(taskId, linkId)) {
      throw new NotFoundException(`link ${linkId} not found`);
    }
    this.repo.deleteLink(taskId, linkId);
    return this.emit('task.updated', this.getTask(taskId));
  }
}

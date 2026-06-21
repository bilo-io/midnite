import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  detectSourceKind,
  MAX_BULK_LINES,
  MAX_TAGS_PER_TASK,
  MAX_TASK_TAG_LENGTH,
  parseBulkLines,
  type BulkCreateTaskResponse,
  type BulkLineResult,
  type Status,
  type Task,
  type TaskCounts,
} from '@midnite/shared';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import { PlannerService } from '../agent/planner.service';
import { mapWithConcurrency } from '../lib/map-with-concurrency';
import { ReposService } from '../repos/repos.service';
import { TasksRepository } from './tasks.repository';
import { TaskEventBus } from './task-event-bus';

// How many bulk lines classify/triage concurrently. Bounded so a large paste
// neither serialises slowly nor floods the LLM (Phase 16 Decision §6).
const BULK_CONCURRENCY = 5;

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
    @Inject(ReposService) private readonly repos: ReposService,
  ) {}

  // Validate a task's repo reference against the registry (Phase 13 B2/Decision §3):
  // an absent/blank repo is "unassigned" (→ undefined); a non-empty name must
  // resolve to a known repo, else we reject rather than persist a dangling string
  // that would silently no-op when resolveCwd later tries to map it to a path.
  private resolveRepoReference(repo: string | undefined): string | undefined {
    const name = repo?.trim();
    if (!name) return undefined;
    if (!this.repos.findByName(name)) {
      const known = this.repos.list().map((r) => r.name);
      const hint = known.length ? ` — known repos: ${known.join(', ')}` : ' — no repos are registered';
      throw new BadRequestException(`unknown repo "${name}"${hint}`);
    }
    return name;
  }

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

  // `opts.emit: false` suppresses the per-task `task.created` broadcast so a bulk
  // create can coalesce the whole batch into one board event (createBulk); the
  // task is still persisted and returned. Defaults to broadcasting.
  async createFromPrompt(input: CreateTaskInput, opts: { emit?: boolean } = {}): Promise<Task> {
    // Validate the repo reference up front so an unknown repo fails fast (before
    // spending the classify/triage model calls) rather than persisting a dangling
    // name.
    const repo = this.resolveRepoReference(input.repo);

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
      repo: repo ?? null,
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

    const task = this.getTask(id);
    if (opts.emit === false) return task;
    return this.emit('task.created', task);
  }

  // Create many tasks from a pasted blob — pure composition over the single-task
  // pipeline: each parsed line fans through `createFromPrompt` (so classify,
  // triage, repo/project/priority all apply uniformly) with its per-task
  // broadcast suppressed, and the batch emits ONE `tasks.bulkCreated` event.
  // Partial failure is first-class: a line that throws comes back as an error
  // row while the rest succeed (Phase 16 Decisions §1/§2/§6).
  async createBulk(input: {
    raw?: string;
    lines?: string[];
    repo?: string;
    projectId?: string;
    priority?: number;
  }): Promise<BulkCreateTaskResponse> {
    const lines =
      input.lines && input.lines.length > 0
        ? input.lines.map((l) => l.trim()).filter(Boolean)
        : parseBulkLines(input.raw ?? '');

    if (lines.length === 0) {
      throw new BadRequestException('no task lines found in the bulk request');
    }
    if (lines.length > MAX_BULK_LINES) {
      throw new BadRequestException(
        `bulk request exceeds the ${MAX_BULK_LINES}-line cap (got ${lines.length})`,
      );
    }
    // The repo is batch-wide, so validate it once: an unknown one fails the whole
    // request with a single clear error rather than N identical per-line error rows
    // (createFromPrompt re-validates the same name per line — cheap and idempotent).
    this.resolveRepoReference(input.repo);

    const results = await mapWithConcurrency(
      lines,
      BULK_CONCURRENCY,
      async (line): Promise<BulkLineResult> => {
        try {
          const task = await this.createFromPrompt(
            {
              prompt: line,
              repo: input.repo,
              projectId: input.projectId,
              priority: input.priority,
              images: [],
            },
            { emit: false },
          );
          return { line, taskId: task.id, kind: task.kind, status: task.status };
        } catch (err) {
          return { line, error: err instanceof Error ? err.message : String(err) };
        }
      },
    );

    const createdIds = results.flatMap((r) => (r.taskId ? [r.taskId] : []));
    // One coalesced board signal for the whole batch instead of N refetches.
    if (createdIds.length > 0) {
      this.bus.emit({
        type: 'tasks.bulkCreated',
        at: new Date().toISOString(),
        taskIds: createdIds,
      });
    }

    return {
      results,
      counts: {
        created: createdIds.length,
        skipped: this.countSkipped(input, lines.length),
        failed: results.length - createdIds.length,
      },
    };
  }

  // Lines dropped before creation: input lines the client sent that didn't make
  // it past parsing (blanks / comments / markers-only). For `raw`, count the
  // physical lines (ignoring a trailing newline) minus what survived parsing.
  private countSkipped(input: { raw?: string; lines?: string[] }, keptCount: number): number {
    if (input.lines && input.lines.length > 0) {
      return Math.max(0, input.lines.length - keptCount);
    }
    const raw = input.raw ?? '';
    if (!raw) return 0;
    const physical = raw.replace(/\n+$/, '').split('\n').length;
    return Math.max(0, physical - keptCount);
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

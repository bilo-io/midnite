import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ANSWER_EVENT_KIND,
  detectSourceKind,
  MAX_BULK_LINES,
  MAX_TAGS_PER_TASK,
  MAX_TASK_TAG_LENGTH,
  parseBulkLines,
  resolveChecksForRepo,
  TaskDependencyError,
  type AgentActivityEvent,
  type AgentAttentionEvent,
  type Breakdown,
  type BreakdownTask,
  type BulkCreateTaskResponse,
  type BulkLineResult,
  type CheckRun,
  type FailureClass,
  type MidniteConfig,
  type Status,
  type Task,
  type TaskCounts,
  type TaskFailure,
  type TeamScope,
} from '@midnite/shared';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import { PlannerService } from '../agent/planner.service';
import { AuditService } from '../audit/audit.service';
import { ChecksService } from '../checks/checks.service';
import { MIDNITE_CONFIG } from '../config.token';
import { mapWithConcurrency } from '../lib/map-with-concurrency';
import { ReposService } from '../repos/repos.service';
import { buildTaskReport, taskReportFilename } from './lib/task-report';
import { TaskFailuresRepository } from './task-failures.repository';
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
  /** Ids of blocker tasks (Phase 27) — each must exist; the new task can't form a cycle. */
  dependsOn?: string[];
  images: Array<ClassifierImage & { size: number; originalName?: string }>;
  /** userId of the creating user (Phase 33 C3). Null for legacy static-token path. */
  createdBy?: string;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(TasksRepository) private readonly repo: TasksRepository,
    @Inject(TaskFailuresRepository) private readonly failures: TaskFailuresRepository,
    @Inject(TaskClassifier) private readonly classifier: TaskClassifier,
    @Inject(PlannerService) private readonly planner: PlannerService,
    @Inject(TaskEventBus) private readonly bus: TaskEventBus,
    @Inject(ReposService) private readonly repos: ReposService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    // ChecksService is optional — when absent (unit tests, partial installs) the
    // gate is skipped fail-open (same as the runner's @Optional wiring, Phase 30).
    @Optional() @Inject(ChecksService) private readonly checks?: ChecksService,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
  ) {}

  // Resolve a task's repo reference against the registry (Phase 13 B2). A blank
  // value means "unassigned" (null). A non-empty name must match a registered
  // repo — an unknown name is rejected up front rather than persisted as a
  // dangling free string that silently no-ops at cwd-resolution time (Decision
  // §3). The stored reference is the registry-unique name, not an id (Decision §1).
  private resolveRepoReference(repo: string | undefined): string | null {
    const name = repo?.trim();
    if (!name) return null;
    if (!this.repos.findByName(name)) {
      throw new BadRequestException(`unknown repo "${name}"`);
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

  // Emit a coarse agent-activity event on the board WS (Phase 31 Theme A). Carries
  // only a summarized label — never raw tool_input. Fire-and-forget; never throws.
  emitActivity(
    sessionId: string,
    phase: AgentActivityEvent['phase'],
    tool?: string,
    label?: string,
  ): void {
    this.bus.emit({ type: 'agent.activity', at: new Date().toISOString(), sessionId, phase, tool, label });
  }

  // Emit an agent-attention event when an agent blocks on the user (Phase 31 Theme A).
  emitAttention(sessionId: string, reason: AgentAttentionEvent['reason'], summary?: string): void {
    this.bus.emit({ type: 'agent.attention', at: new Date().toISOString(), sessionId, reason, summary });
  }

  // Re-broadcast a blocker's dependents after the blocker reaches a terminal
  // state (Phase 27 Theme B). Scheduling readiness is recomputed in SQL each
  // tick, so this changes no scheduling outcome — it only nudges the board to
  // re-render the derived "blocked by N" chip (`done` → may unblock; `abandoned`
  // → held, now blocked-by-abandoned) without waiting for a natural refresh.
  private notifyDependents(blockerId: string): void {
    for (const dependentId of this.repo.dependentsOf(blockerId)) {
      this.emit('task.updated', this.getTask(dependentId));
    }
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

  listTasks(status?: Status, projectId?: string, scope?: TeamScope): Task[] {
    return this.repo.listTasks(status, projectId, scope).map((r) => this.repo.hydrate(r));
  }

  /**
   * `todo` tasks that are *ready* to schedule — every blocker is `done` (Phase 27
   * Theme B). Backs the scheduler's ready-gating; preserves the
   * `desc(priority), asc(createdAt)` ordering of {@link listTasks} among ready
   * tasks, so a blocked high-priority task can't jump its blocker.
   */
  listReadyTodoTasks(): Task[] {
    // `now` gates backed-off retries (Phase 53 B): a todo task whose nextRetryAt
    // is still in the future is skipped until its backoff window elapses.
    const now = new Date().toISOString();
    return this.repo.listReadyTodoTasks(now).map((r) => this.repo.hydrate(r));
  }

  getTask(id: string, scope?: TeamScope): Task {
    const row = this.repo.getTask(id, scope);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    return this.repo.hydrate(row);
  }

  /** Serialize a task thread (+ its events/links) as a downloadable markdown report. */
  exportMarkdown(id: string): { filename: string; markdown: string } {
    const task = this.getTask(id); // throws NotFoundException for an unknown id
    return { filename: taskReportFilename(task), markdown: buildTaskReport(task) };
  }

  updateStatus(id: string, status: Status): Task {
    const now = new Date().toISOString();
    const before = this.repo.getTask(id);
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
    this.audit?.record({
      entityType: 'task',
      entityId: id,
      userId: row.createdBy,
      action: 'task.status_changed',
      payload: { from: before?.status, to: status },
    });
    const updated = this.emit('task.updated', this.getTask(id));
    // A blocker reaching a terminal state changes its dependents' readiness, so
    // refresh their derived "blocked by N" chip promptly (Phase 27 Theme B).
    if (status === 'done' || status === 'abandoned') this.notifyDependents(id);
    return updated;
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
    // The backoff gate is spent once the task actually starts (Phase 53 B): clear
    // it so a stale future nextRetryAt can never linger onto a later todo state
    // (e.g. a re-open path that doesn't route through requeue()).
    this.repo.clearNextRetry(id, now);
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
    // A human-returned task is eligible now — drop any pending backoff (Phase 53 B).
    this.repo.clearNextRetry(id, now);
    this.repo.insertEvent({ id: randomUUID(), taskId: id, at: now, kind: 'agent.requeued' });
    return this.emit('task.updated', this.getTask(id));
  }

  /** Crash retry: bump the retry counter, then → todo (clearing the session).
   *  Distinct from {@link requeue} (a transient/restart return that doesn't
   *  count against the retry budget). `nextRetryAt` (Phase 53 B) is the ISO time
   *  before which the scheduler must not re-pick the task; null = eligible now. */
  retry(id: string, nextRetryAt: string | null = null): Task {
    const now = new Date().toISOString();
    if (!this.repo.getTask(id)) throw new NotFoundException(`task ${id} not found`);
    this.repo.incrementRetry(id, now, nextRetryAt);
    this.repo.updateStatus(id, 'todo', now);
    this.repo.setSession(id, null, now);
    const retryCount = this.repo.getTask(id)?.retryCount ?? 0;
    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'agent.retried',
      data: JSON.stringify({ retryCount, nextRetryAt }),
    });
    return this.emit('task.updated', this.getTask(id));
  }

  /** Increment the auto-fix attempt counter (Phase 30 C). Does not change status. */
  incrementFixAttempts(id: string): Task {
    const now = new Date().toISOString();
    if (!this.repo.getTask(id)) throw new NotFoundException(`task ${id} not found`);
    this.repo.incrementFixAttempts(id, now);
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
    const done = this.emit('task.updated', this.getTask(id));
    // Completing a blocker may release its dependents — the scheduler picks them
    // up on its next tick automatically; re-emit them so the board's "blocked by
    // N" chip clears promptly (Phase 27 Theme B).
    this.notifyDependents(id);
    return done;
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
    this.audit?.record({ entityType: 'task', entityId: id, userId: row.createdBy, action: 'task.deleted' });
  }

  // `opts.emit: false` suppresses the per-task `task.created` broadcast so a bulk
  // create can coalesce the whole batch into one board event (createBulk); the
  // task is still persisted and returned. Defaults to broadcasting.
  async createFromPrompt(input: CreateTaskInput, opts: { emit?: boolean } = {}): Promise<Task> {
    // Reject an unknown repo before any work (classify/triage/insert).
    const explicitRepo = this.resolveRepoReference(input.repo);

    // Validate any requested blockers up front (existence + dedupe). A brand-new
    // task can't be in a cycle — nothing depends on it yet — so only existence is
    // checked; the edges are written after the task row exists.
    const dependsOn = this.resolveDependencies(input.dependsOn);

    // When the caller named no repo at all (vs. an explicit blank = "unassigned"),
    // let the planner guess one from the registry (Phase 4 / outstanding #5).
    // Runs alongside classify/triage and is fail-soft (→ null on AI-off/error/no
    // match), so it never breaks creation. Skipped when the registry is empty.
    const registry = input.repo === undefined ? this.repos.list() : [];
    const guessPromise =
      registry.length > 0
        ? this.planner.guessRepo(
            input.prompt,
            registry.map((r) => ({ name: r.name, path: r.path })),
          )
        : Promise.resolve<string | null>(null);

    // Triage (plan model: ready→todo / not→backlog), classify (title/kind), and
    // the repo guess run concurrently — all fail-soft, so none breaks creation.
    const [classified, triage, guessedRepo] = await Promise.all([
      this.classifier.classify(
        input.prompt,
        input.images.map((i) => ({ path: i.path, mime: i.mime })),
      ),
      this.planner.triage(input.prompt),
      guessPromise,
    ]);

    const repo = explicitRepo ?? guessedRepo;
    const repoInferred = explicitRepo === null && guessedRepo !== null;

    // A question is answered inline rather than queued for an agent: generate a
    // direct answer (fail-soft → null) and, if we got one, resolve the task to
    // `done` with the answer recorded on its thread. Only `question`-kind tasks
    // take this path, so the extra plan-model call is rare.
    const answer = classified.kind === 'question' ? await this.planner.answer(input.prompt) : null;

    const id = randomUUID();
    const now = new Date().toISOString();

    this.repo.insertTask({
      id,
      title: classified.title,
      kind: classified.kind,
      // A generated inline answer resolves the task to `done`; otherwise an
      // explicit caller status wins, falling back to the planner's triage column.
      status: answer ? 'done' : (input.status ?? (triage.ready ? 'todo' : 'backlog')),
      priority: clampPriority(input.priority),
      prompt: input.prompt,
      repo,
      projectId: input.projectId ?? null,
      agentId: null,
      sessionId: null,
      prUrl: null,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy ?? null,
    });

    for (const dep of dependsOn) {
      this.repo.addDependency(id, dep, now);
    }

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
        // Audit trail: note when the repo was inferred by the planner rather
        // than set by the caller, so an unexpected assignment is explainable.
        ...(repoInferred ? { repo, repoInferred: true } : {}),
      }),
    });

    // Record the inline answer on the task thread (surfaced in the web thread
    // view) so the resolved question carries its answer with it.
    if (answer) {
      this.repo.insertEvent({
        id: randomUUID(),
        taskId: id,
        at: now,
        kind: ANSWER_EVENT_KIND,
        data: JSON.stringify({ text: answer }),
      });
    }

    const task = this.getTask(id);
    this.audit?.record({ entityType: 'task', entityId: id, userId: input.createdBy, action: 'task.created' });
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

    // The repo applies batch-wide, so reject an unknown one once up front rather
    // than letting every line fail individually (createFromPrompt re-validates).
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

  // Turn a structured Breakdown (Phase 28) into a real, dependency-wired board.
  // Each task is created with its explicit title/kind/priority (no AI classify —
  // the breakdown already carries them), tagged to the optional project/repo, as
  // `todo`. Local `ref`s are then resolved to created ids and the Phase 27
  // dependency edges added; a self-reference, an unknown ref, or an edge that
  // would close a cycle is **pruned (skipped), not fatal** (Decision §3 / Theme
  // B). One coalesced `tasks.bulkCreated` board event for the whole batch (no
  // per-task broadcast), mirroring `createBulk`. Deterministic + LLM-free, so it
  // never breaks on AI being disabled.
  createTasksFromBreakdown(
    breakdown: Breakdown,
    opts: {
      projectId?: string;
      repo?: string;
      /** Per-task tags to stamp on each created task (Phase 42 Theme D seeding). */
      tagsFor?: (task: BreakdownTask) => string[];
    } = {},
  ): Task[] {
    // Validate the batch repo once (an unknown name 400s up front, like create).
    const repo = this.resolveRepoReference(opts.repo);
    const now = new Date().toISOString();

    // 1) Create a task per unique ref, collecting ref → created id. A duplicate
    // ref is dropped (first wins) so later edge resolution stays unambiguous.
    const idByRef = new Map<string, string>();
    const order: Array<{ ref: string; dependsOn: string[]; id: string }> = [];
    for (const bt of breakdown.tasks) {
      if (idByRef.has(bt.ref)) continue;
      const id = randomUUID();
      this.repo.insertTask({
        id,
        title: bt.title,
        kind: bt.kind ?? 'unknown',
        status: 'todo',
        priority: clampPriority(bt.priority),
        prompt: null,
        repo,
        agentId: null,
        sessionId: null,
        projectId: opts.projectId ?? null,
        prUrl: null,
        createdAt: now,
        updatedAt: now,
      });
      this.repo.insertEvent({
        id: randomUUID(),
        taskId: id,
        at: now,
        kind: 'task.created',
        data: JSON.stringify({
          source: 'breakdown',
          ref: bt.ref,
          ...(opts.projectId ? { projectId: opts.projectId } : {}),
        }),
      });
      const tags = opts.tagsFor?.(bt);
      if (tags && tags.length > 0) {
        this.repo.setTags(id, normalizeTags(tags), now);
      }
      idByRef.set(bt.ref, id);
      order.push({ ref: bt.ref, dependsOn: bt.dependsOn, id });
    }

    // 2) Wire the dependency edges. All tasks exist now, so a ref resolves to a
    // real id; prune a self-edge, an unknown ref, or one that would close a cycle
    // (the check sees edges added earlier in this loop). `addDependency` is a
    // no-op on a duplicate pair.
    for (const { dependsOn, id } of order) {
      for (const depRef of dependsOn) {
        const blockerId = idByRef.get(depRef);
        if (!blockerId || blockerId === id) continue;
        if (this.wouldCreateCycle(id, blockerId)) continue;
        this.repo.addDependency(id, blockerId, now);
      }
    }

    // 3) One coalesced board signal for the batch (no per-task broadcast).
    const ids = order.map((o) => o.id);
    if (ids.length > 0) {
      this.bus.emit({ type: 'tasks.bulkCreated', at: new Date().toISOString(), taskIds: ids });
    }
    return ids.map((id) => this.getTask(id));
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

  // Set the scheduling priority band (0–3). Re-broadcasts so the board re-ranks.
  setPriority(id: string, priority: number): Task {
    const now = new Date().toISOString();
    const row = this.repo.setPriority(id, priority, now);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'task.priority.changed',
      data: JSON.stringify({ priority }),
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

  // ---- dependencies (Phase 27) ----

  /**
   * Add a blocker edge: `taskId` depends on `dependsOnId`. Rejects a
   * self-reference, an unknown blocker, or an edge that would close a cycle
   * (`TaskDependencyError`, mapped to 400/409 at the controller). Idempotent on
   * a duplicate pair. Emits `task.updated` so the board's blocked chip refreshes.
   */
  addDependency(taskId: string, dependsOnId: string): Task {
    if (!this.repo.getTask(taskId)) throw new NotFoundException(`task ${taskId} not found`);
    if (taskId === dependsOnId) {
      throw new TaskDependencyError('self-reference', 'a task cannot depend on itself');
    }
    if (!this.repo.getTask(dependsOnId)) {
      throw new TaskDependencyError('unknown-task', `blocker task ${dependsOnId} not found`);
    }
    if (this.wouldCreateCycle(taskId, dependsOnId)) {
      throw new TaskDependencyError(
        'cycle',
        `depending on ${dependsOnId} would create a dependency cycle`,
      );
    }
    this.repo.addDependency(taskId, dependsOnId, new Date().toISOString());
    return this.emit('task.updated', this.getTask(taskId));
  }

  /** Drop a blocker edge (idempotent). Emits `task.updated`. */
  removeDependency(taskId: string, dependsOnId: string): Task {
    if (!this.repo.getTask(taskId)) throw new NotFoundException(`task ${taskId} not found`);
    this.repo.removeDependency(taskId, dependsOnId);
    return this.emit('task.updated', this.getTask(taskId));
  }

  // Validate caller-supplied blocker ids for a new task: dedupe, drop blanks,
  // reject a non-existent blocker. No cycle check needed — a task being created
  // has no dependents yet, so no edge into it can exist.
  private resolveDependencies(dependsOn: string[] | undefined): string[] {
    if (!dependsOn || dependsOn.length === 0) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const raw of dependsOn) {
      const id = raw.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (!this.repo.getTask(id)) {
        throw new TaskDependencyError('unknown-task', `blocker task ${id} not found`);
      }
      out.push(id);
    }
    return out;
  }

  // ── Check-run persistence + events (Phase 30 B2/B3) ──────────────────────

  /** Persist a completed gate/manual/auto-fix check run for a task. */
  saveCheckRun(run: CheckRun): void {
    this.repo.insertCheckRun({
      id: run.id,
      taskId: run.taskId,
      trigger: run.trigger,
      passed: run.passed ? 1 : 0,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      results: JSON.stringify(run.results),
    });
  }

  /**
   * Emit a check-lifecycle task event and broadcast `task.updated` (Phase 30 B3).
   * `kind` is one of `checks.started` / `checks.passed` / `checks.failed` /
   * `checks.fix.started` / `checks.fix.exhausted`.
   */
  recordCheckEvent(
    taskId: string,
    kind:
      | 'checks.started'
      | 'checks.passed'
      | 'checks.failed'
      | 'checks.fix.started'
      | 'checks.fix.exhausted',
  ): void {
    const now = new Date().toISOString();
    this.repo.insertEvent({ id: randomUUID(), taskId, at: now, kind });
    this.emit('task.updated', this.getTask(taskId));
  }

  /**
   * Phase 53 Theme A — record a typed failure for a task run + a companion
   * `agent.failed` event so the thread stays readable. Purely additive: it writes
   * a `task_failures` row and never changes task state (the caller's existing
   * retry/abandon/waiting transition is untouched). Best-effort and fail-open —
   * a recording error must never break the failure path, so it swallows + logs.
   */
  recordFailure(
    taskId: string,
    failure: { class: FailureClass; detail: string; exitCode?: number; lastOutput?: string | null },
  ): void {
    try {
      const now = new Date().toISOString();
      const task = this.repo.getTask(taskId);
      if (!task) return;
      this.failures.insert({
        id: randomUUID(),
        taskId,
        class: failure.class,
        detail: failure.detail,
        exitCode: failure.exitCode ?? null,
        lastOutput: failure.lastOutput ?? null,
        retryIndex: task.retryCount ?? 0,
        teamId: task.teamId ?? null,
        at: now,
      });
      this.repo.insertEvent({
        id: randomUUID(),
        taskId,
        at: now,
        kind: 'agent.failed',
        data: JSON.stringify({ class: failure.class, detail: failure.detail }),
      });
      this.emit('task.updated', this.getTask(taskId));
    } catch (err) {
      this.logger.warn(
        `recordFailure: failed to record ${failure.class} for ${taskId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  /** A task's recorded failure history (oldest-first) — for the health view (E). */
  listFailures(taskId: string): TaskFailure[] {
    return this.failures.listByTask(taskId);
  }

  // ── Manual check trigger (Phase 30 D) ────────────────────────────────────

  /**
   * Trigger a manual check run for a task (`POST /tasks/:id/check`). Mirrors the
   * gate flow in `AgentRunnerService.completeWithChecks` but uses trigger `manual`.
   * Returns a no-op stub run (passed, zero results) when the gate is disabled, the
   * task has no repo, no checks are configured, or `ChecksService` is absent.
   */
  async runManualCheck(taskId: string): Promise<CheckRun> {
    const task = this.getTask(taskId); // 404 if missing
    const cfg = this.config.checks;
    const resolved = cfg.enabled ? resolveChecksForRepo(cfg, task.repo ?? null) : [];
    const repo = task.repo ? this.repos.findByName(task.repo) : undefined;

    if (!cfg.enabled || resolved.length === 0 || !repo || !this.checks) {
      // No-op: return a synthetic passed run without persisting (gate is off/absent).
      const now = new Date().toISOString();
      return {
        id: randomUUID(),
        taskId,
        trigger: 'manual',
        startedAt: now,
        finishedAt: now,
        passed: true,
        results: [],
      };
    }

    const cwd = repo.path.startsWith('~/') ? join(homedir(), repo.path.slice(2)) : repo.path;

    this.recordCheckEvent(taskId, 'checks.started');
    const run = await this.checks.run(taskId, resolved, cwd, 'manual');
    this.saveCheckRun(run);
    this.recordCheckEvent(taskId, run.passed ? 'checks.passed' : 'checks.failed');
    return run;
  }

  /** Return all check runs for a task, ordered oldest-first. */
  getCheckRuns(taskId: string): CheckRun[] {
    this.getTask(taskId); // 404 if missing
    return this.repo.checkRunsForTask(taskId);
  }

  // Would adding `taskId → dependsOnId` close a cycle? It does iff `dependsOnId`
  // already (transitively) depends on `taskId`. DFS over the blocker edges from
  // `dependsOnId` looking for `taskId` (mirrors the workflow-engine reachability
  // check); `seen` guards against an already-cyclic store looping forever.
  private wouldCreateCycle(taskId: string, dependsOnId: string): boolean {
    const seen = new Set<string>();
    const stack = [dependsOnId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === taskId) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      stack.push(...this.repo.dependenciesOf(current));
    }
    return false;
  }
}

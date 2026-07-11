import { z } from 'zod';
import { CheckRunStatusSchema } from './checks.js';
import { PrStatusSchema, SOURCE_KINDS } from './source.js';
import { WaitReasonSchema } from './task-failure.js';

export const STATUSES = [
  'backlog',
  'todo',
  'wip',
  'waiting',
  'done',
  'abandoned',
] as const;

export const TASK_KINDS = [
  'bug',
  'feature',
  'question',
  'chore',
  'unknown',
] as const;

export const StatusSchema = z.enum(STATUSES);
export const TaskKindSchema = z.enum(TASK_KINDS);

/**
 * Terminal statuses — a completed or abandoned task is *done with*: it holds no
 * slot, the scheduler never re-picks it, and (Phase 60 E) nothing may transition
 * it back to an active state. Reviving a terminal task is always a bug (a zombie
 * `wip` with no agent, a duplicate PR, an un-abandoned task whose dependents
 * unblock off cancelled work) — see {@link canTransition}.
 */
export const TERMINAL_STATUSES = ['done', 'abandoned'] as const;

/** True when `status` is a terminal state (`done`/`abandoned`) — no outgoing transitions. */
export function isTerminal(status: Status): boolean {
  return status === 'done' || status === 'abandoned';
}

/**
 * The task state machine's allowed transitions (Phase 60 E). Before this the
 * machine was guard-by-convention — every writer set its target with at most an
 * idempotency check on the *target*, never a validated *from* — so `updateStatus`
 * (and a board drag routing through it) could commit any edge, including
 * terminal→active revivals. This is the single source of truth both the gateway
 * (authoritative, throws on an illegal move) and the web (disable illegal drags)
 * share. Terminal states have **no** outgoing edges; a deliberate "reopen" would
 * be its own explicit action that also clears `archivedAt`/`sessionId`.
 */
export const ALLOWED_TRANSITIONS: Record<Status, readonly Status[]> = {
  backlog: ['todo', 'wip', 'abandoned'],
  todo: ['backlog', 'wip', 'waiting', 'done', 'abandoned'],
  wip: ['todo', 'backlog', 'waiting', 'done', 'abandoned'],
  waiting: ['todo', 'backlog', 'wip', 'done', 'abandoned'],
  done: [],
  abandoned: [],
};

/**
 * Whether a task may move from `from` to `to`. A same-status move is always
 * allowed (idempotent no-op); otherwise the edge must be in
 * {@link ALLOWED_TRANSITIONS}. Notably every terminal→* move (except the no-op)
 * is rejected. The gateway enforces this in `TasksService.updateStatus`; the web
 * uses it to disable illegal board drags so both agree on one table.
 */
export function canTransition(from: Status, to: Status): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Why the scheduler is *holding* a ready `todo` task instead of spawning it
 * (Phase 50 Theme B). `over-budget` = a hard spend cap is exceeded;
 * `rate-limited` = the spawns-per-hour window is full. Purely **derived** from
 * the scheduler's in-memory guardrail state (never persisted, no new status) —
 * a held task stays `todo` and re-evaluates every tick. Drives the board's
 * "held" chip; absent when the task is spawnable.
 */
export const TASK_HELD_REASONS = ['over-budget', 'rate-limited'] as const;
export const TaskHeldReasonSchema = z.enum(TASK_HELD_REASONS);
export type TaskHeldReason = z.infer<typeof TaskHeldReasonSchema>;

/** Human copy for a held reason — shared by the board chip + notification. */
export const TASK_HELD_REASON_LABEL: Record<TaskHeldReason, string> = {
  'over-budget': 'over budget',
  'rate-limited': 'rate-limited',
};

export const TaskEventSchema = z.object({
  at: z.string(),
  kind: z.string(),
  data: z.record(z.unknown()).optional(),
});

export const TaskAttachmentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  path: z.string(),
  mime: z.string(),
  size: z.number().int().nonnegative(),
  originalName: z.string().optional(),
  createdAt: z.string(),
});

export const TaskLinkSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  url: z.string().url(),
  kind: z.enum(SOURCE_KINDS),
  label: z.string().optional(),
  createdAt: z.string(),
});

export const AddTaskLinkRequestSchema = z.object({
  url: z.string().url(),
  label: z.string().max(200).optional(),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: TaskKindSchema.optional(),
  repo: z.string().optional(),
  prompt: z.string().optional(),
  status: StatusSchema,
  /** Scheduling priority: 0 Low · 1 Normal · 2 High · 3 Urgent. Higher runs first. */
  priority: z.number().int().min(0).max(3).default(1),
  /** How many times an agent run has been auto-retried after an unexpected exit. */
  retryCount: z.number().int().nonnegative().default(0),
  /** How many times the agent was re-spawned to fix a failing quality gate (Phase 30 C). */
  fixAttempts: z.number().int().nonnegative().default(0),
  /**
   * Earliest ISO time a backed-off retry may be re-picked (Phase 53 B). Set when a
   * retryable failure re-queues the task; the scheduler's ready-set skips a `todo`
   * task until this elapses. Absent/null = eligible immediately.
   */
  nextRetryAt: z.string().nullable().optional(),
  /**
   * Why the task is parked in `waiting` (Phase 53 D). `needs-input` = the agent
   * blocked on live user input; any other reason = a failure escalated it to a
   * **needs-attention** state (never silently `abandoned`). Set on the transition
   * into `waiting`, cleared on any exit from it. Absent when not waiting.
   */
  waitReason: WaitReasonSchema.nullable().optional(),
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
  /** Phase 58 D — the project milestone this task is assigned to (at most one);
   *  absent = unassigned (roadmap backlog). Cleared when its milestone is deleted. */
  milestoneId: z.string().optional(),
  prUrl: z.string().optional(),
  /**
   * Live status of the task's GitHub PR (Phase 22 Theme C), resolved by the
   * gateway's poller from {@link prUrl}. Absent until first fetched (or when the
   * URL isn't a parseable PR). The gateway always populates it on read when known.
   */
  prStatus: PrStatusSchema.optional(),
  /** Free-form user labels. App-validated (trimmed, de-duped, capped); defaults to none. */
  tags: z.array(z.string()).default([]),
  /**
   * Ids of the tasks that block this one — derived from the dependency edges, not
   * a stored column (Phase 27). The task is *ready* to run only when every blocker
   * is `done`; "blocked" is computed from these + blocker states, not a status.
   * Optional like `links`/`attachments` (the gateway always populates it on read);
   * absent on a fixture/partial means "no blockers".
   */
  dependsOn: z.array(z.string()).optional(),
  /**
   * Derived quality-gate status for the task's latest check run (Phase 30 Theme D).
   * Absent when no check run exists. `passing` when the latest run passed; `failing`
   * when it failed (and the task isn't yet `done`). Computed — not stored.
   */
  checkRunStatus: CheckRunStatusSchema.optional(),
  /**
   * Why the scheduler is holding this ready `todo` task rather than spawning it
   * (Phase 50 Theme B) — a hard budget/rate cap is blocking. Derived from the
   * scheduler's in-memory guardrail state, not stored; absent when spawnable.
   */
  heldReason: TaskHeldReasonSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  /** ISO timestamp when the task (and thus its session) was archived; absent when active. */
  archivedAt: z.string().optional(),
  /** userId of the user who created this task; null for tasks created before Phase 33. */
  createdBy: z.string().optional(),
  /** teamId this task belongs to; null for personal tasks. */
  teamId: z.string().optional(),
  events: z.array(TaskEventSchema),
  attachments: z.array(TaskAttachmentSchema).optional(),
  links: z.array(TaskLinkSchema).optional(),
  /**
   * AI code review result (Phase 37 Theme D). Set by AiReviewService when a
   * code-review workflow run completes for this task's prUrl. Absent until then.
   */
  aiReview: z
    .object({
      verdict: z.enum(['approved', 'commented', 'changes-requested']),
      summary: z.string(),
      runId: z.string(),
      reviewedAt: z.string(),
    })
    .optional(),
});

/**
 * Phase 57 C — the lean board-card DTO. `GET /tasks` returns these instead of the
 * full {@link Task} (which carries the whole event thread + every attachment/link
 * — ~5–25 KB/task, 1–2.5 MB/board). A summary keeps exactly what a board card
 * renders and drops the rest:
 * - **no** `events` (the biggest payload); `answered` is precomputed server-side
 *   in its place (what `isAnsweredQuestion` derived from the thread).
 * - **no** `prompt`/`agentId`/`sessionId`/`fixAttempts`/scope metadata.
 * - `attachments` is trimmed to the **first image only** (the card's thumbnail),
 *   `links` capped at the six the card shows — same shapes, fewer rows.
 * - `dependsOn` kept (ids only — the board computes its "blocked by N" chip from
 *   the loaded set), plus the derived `prStatus`/`checkRunStatus`/`heldReason`.
 * The full {@link Task} stays the **detail** shape (`GET /tasks/:id`).
 */
export const TaskSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: TaskKindSchema.optional(),
  status: StatusSchema,
  priority: z.number().int().min(0).max(3).default(1),
  retryCount: z.number().int().nonnegative().default(0),
  repo: z.string().optional(),
  projectId: z.string().optional(),
  /** Phase 58 D — milestone assignment (kept lean so the roadmap groups cards). */
  milestoneId: z.string().optional(),
  /** Phase 58 F — the assigned milestone's name, joined server-side so the card
   *  can show a milestone chip without a separate milestones fetch. */
  milestoneName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  prUrl: z.string().optional(),
  prStatus: PrStatusSchema.optional(),
  checkRunStatus: CheckRunStatusSchema.optional(),
  heldReason: TaskHeldReasonSchema.optional(),
  waitReason: WaitReasonSchema.nullable().optional(),
  /** Blocker ids (Phase 27) — kept so the board derives its "blocked by N" chip. */
  dependsOn: z.array(z.string()).optional(),
  /** First image attachment only (the card thumbnail); other attachments dropped. */
  attachments: z.array(TaskAttachmentSchema).optional(),
  /** Up to the six links the card renders as source icons. */
  links: z.array(TaskLinkSchema).optional(),
  /** AI review verdict + summary (Phase 37) — small, kept for the card's chip. */
  aiReview: z
    .object({
      verdict: z.enum(['approved', 'commented', 'changes-requested']),
      summary: z.string(),
      runId: z.string(),
      reviewedAt: z.string(),
    })
    .optional(),
  /** Server-derived (Phase 57 C): a `question` task with an inline answer event —
   *  precomputed here so the card needn't carry the whole event thread. Optional
   *  so the full {@link Task} stays structurally assignable to a summary. */
  answered: z.boolean().optional(),
  /** Soft-archive timestamp (kept — a cheap scalar the shipped/board widgets read). */
  archivedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type TaskSummary = z.infer<typeof TaskSummarySchema>;

/**
 * One row of the cross-task activity feed (Phase 57 C). The dashboard's activity
 * widget used to hydrate **every** task's full event thread client-side just to
 * show the latest dozen events — the exact N+1 Phase 57 kills. Instead the
 * gateway serves the recent events directly (one indexed `ORDER BY at DESC LIMIT`
 * over `task_events`), team-scoped, as these lean rows.
 */
export const TaskActivityEntrySchema = z.object({
  taskId: z.string(),
  title: z.string(),
  kind: z.string(),
  at: z.string(),
});
export type TaskActivityEntry = z.infer<typeof TaskActivityEntrySchema>;
export const TaskActivityResponseSchema = z.array(TaskActivityEntrySchema);

/**
 * A page of list results (Phase 57 C). Generic over the item shape so every big
 * list endpoint can share one contract: `{ items, total }` where `total` is the
 * full filtered count (not the page length). Offset pagination via `page`/`limit`
 * query params; omitting them returns everything (the board loads all columns).
 * (Ideas keeps its pre-existing `{ ideas, total }` shape — not migrated here.)
 */
export function pagedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
  });
}
export type Paged<T> = { items: T[]; total: number };

/**
 * Reusable offset-pagination query params (Phase 57 C follow-up) shared by the
 * list endpoints (`workflows`/`projects`/`repos`). Both optional — omitting them
 * returns the full set. `TaskListQuerySchema` predates this and inlines the same
 * two fields alongside its own filters.
 */
export const PageQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
export type PageQuery = z.infer<typeof PageQuerySchema>;

export const TasksPageSchema = pagedSchema(TaskSummarySchema);
export type TasksPage = z.infer<typeof TasksPageSchema>;

/** Query params for `GET /tasks` (Phase 57 C). `page`/`limit` optional — absent = all. */
export const TaskListQuerySchema = z.object({
  status: StatusSchema.optional(),
  projectId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;

export const AgentSlotSchema = z.object({
  id: z.string(),
  status: z.enum(['idle', 'busy']),
  taskId: z.string().optional(),
  pid: z.number().int().optional(),
});

export const TaskCountsSchema = z.object({
  backlog: z.number().int().nonnegative(),
  todo: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
});

/** Max blocker edges accepted on a single task — a sane bound on a paste/automation. */
export const MAX_TASK_DEPENDENCIES = 50;

export const CreateTaskRequestSchema = z.object({
  prompt: z.string().min(1).max(8000),
  repo: z.string().optional(),
  projectId: z.string().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  /** Ids of tasks that must be `done` before this one can start (Phase 27). */
  dependsOn: z.array(z.string().min(1)).max(MAX_TASK_DEPENDENCIES).optional(),
});

/** Body for `POST /tasks/:id/dependencies` — add one blocker edge. */
export const AddTaskDependencyRequestSchema = z.object({
  dependsOnId: z.string().min(1),
});

// Reassign (or clear, via null) a task's project.
export const UpdateTaskProjectRequestSchema = z.object({
  projectId: z.string().nullable(),
});

/** Max tags per task and max length per tag — enforced (clamped) in the service. */
export const MAX_TAGS_PER_TASK = 12;
export const MAX_TASK_TAG_LENGTH = 32;

export const SetTaskTagsRequestSchema = z.object({
  tags: z.array(z.string()),
});

/** Body for `PATCH /tasks/:id/priority` — set the scheduling priority band (0–3). */
export const SetTaskPriorityRequestSchema = z.object({
  priority: z.number().int().min(0).max(3),
});

export const CreateTaskResponseSchema = z.object({
  task: TaskSchema,
});

export const ClassifiedTaskSchema = z.object({
  title: z.string().min(1).max(120),
  kind: TaskKindSchema,
});

export type Status = z.infer<typeof StatusSchema>;
export type TaskKind = z.infer<typeof TaskKindSchema>;
export type TaskEvent = z.infer<typeof TaskEventSchema>;
export type TaskAttachment = z.infer<typeof TaskAttachmentSchema>;
export type TaskLink = z.infer<typeof TaskLinkSchema>;
export type AddTaskLinkRequest = z.infer<typeof AddTaskLinkRequestSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type AgentSlot = z.infer<typeof AgentSlotSchema>;
export type TaskCounts = z.infer<typeof TaskCountsSchema>;
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type AddTaskDependencyRequest = z.infer<typeof AddTaskDependencyRequestSchema>;
export type UpdateTaskProjectRequest = z.infer<typeof UpdateTaskProjectRequestSchema>;
export type SetTaskTagsRequest = z.infer<typeof SetTaskTagsRequestSchema>;
export type SetTaskPriorityRequest = z.infer<typeof SetTaskPriorityRequestSchema>;
export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;
export type ClassifiedTask = z.infer<typeof ClassifiedTaskSchema>;

/** Why a dependency edge was rejected (Phase 27) — maps to 400 (self/unknown) or 409 (cycle). */
export const TASK_DEPENDENCY_ERROR_REASONS = ['self-reference', 'cycle', 'unknown-task'] as const;
export type TaskDependencyErrorReason = (typeof TASK_DEPENDENCY_ERROR_REASONS)[number];

/**
 * Thrown by the gateway when a dependency edge is invalid: a self-reference, a
 * blocker that doesn't exist, or an edge that would close a cycle. The gateway
 * controller translates `reason` to an HTTP status; clients can narrow on it.
 */
export class TaskDependencyError extends Error {
  constructor(
    readonly reason: TaskDependencyErrorReason,
    message: string,
  ) {
    super(message);
    this.name = 'TaskDependencyError';
  }
}

/** Task-event kind written when a `question` is answered inline at intake (Phase 15 Theme C). */
export const ANSWER_EVENT_KIND = 'answer';

/**
 * True for a `question`-kind task that was answered inline at intake: the planner
 * generated a direct answer (recorded as an `answer` task-event) and the task was
 * resolved to `done` instead of being queued for an agent. The shared contract for
 * "this is an answered question" so the web UI can show an *Answered* affordance and
 * filter these apart from ordinary completed work without re-deriving the rule.
 */
export function isAnsweredQuestion(task: Pick<Task, 'kind' | 'events'>): boolean {
  return task.kind === 'question' && task.events.some((e) => e.kind === ANSWER_EVENT_KIND);
}

import { z } from 'zod';
import { CheckRunStatusSchema } from './checks.js';
import { PrStatusSchema, SOURCE_KINDS } from './source.js';

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
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
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

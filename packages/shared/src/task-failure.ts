import { z } from 'zod';

/**
 * Phase 53 Theme A — the failure taxonomy. Every way a task run can fail gets a
 * name, so backoff (B), watchdogs (C), escalation (D), and the health UI (E) can
 * all reason about *why* rather than collapsing everything into `abandoned`.
 *
 * - `crash`             — the agent process exited non-zero unexpectedly.
 * - `timeout`           — the per-run timer fired and the run was cancelled.
 * - `no-pr`             — the agent stopped without opening a PR (Stop hook).
 * - `gate-failed`       — a quality gate failed with no auto-fix left.
 * - `tool-denied`       — a blast-radius guard denied a tool (ties to Phase 50).
 * - `inactivity`        — a `wip` session went silent past the window (Theme C).
 * - `retries-exhausted` — the retry budget ran out (a terminal roll-up).
 * - `unknown`           — unclassified; escalated rather than blindly retried.
 */
export const FAILURE_CLASSES = [
  'crash',
  'timeout',
  'no-pr',
  'gate-failed',
  'tool-denied',
  'inactivity',
  'retries-exhausted',
  'unknown',
] as const;

export const FailureClassSchema = z.enum(FAILURE_CLASSES);
export type FailureClass = z.infer<typeof FailureClassSchema>;

/**
 * Which classes are worth auto-retrying (consumed by Theme B). Transient /
 * environmental failures retry with backoff; the rest escalate to a human
 * (Theme D) rather than re-running identically. `unknown` is conservative — we
 * escalate rather than risk a crash-loop on an unclassified persistent failure.
 */
export const FAILURE_RETRYABLE: Record<FailureClass, boolean> = {
  crash: true,
  timeout: true,
  inactivity: true,
  'no-pr': false,
  'gate-failed': false,
  'tool-denied': false,
  'retries-exhausted': false,
  unknown: false,
};

export function isRetryableFailure(cls: FailureClass): boolean {
  return FAILURE_RETRYABLE[cls];
}

/** Human labels for the classes (menus, chips, CLI). */
export const FAILURE_CLASS_LABEL: Record<FailureClass, string> = {
  crash: 'Crashed',
  timeout: 'Timed out',
  'no-pr': 'No PR opened',
  'gate-failed': 'Gate failed',
  'tool-denied': 'Tool denied',
  inactivity: 'Went silent',
  'retries-exhausted': 'Retries exhausted',
  unknown: 'Unknown',
};

/**
 * A persisted record of a single task-run failure (one row per failure in the
 * `task_failures` table). `retryIndex` is the `retryCount` at the moment of the
 * failure, so "failed 3× — all timeouts" is a queryable fact.
 */
export const TaskFailureSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  class: FailureClassSchema,
  /** Short human-readable reason (e.g. "exit 137", "no output for 12m"). */
  detail: z.string(),
  /** Process exit code when the failure was a crash; absent otherwise. */
  exitCode: z.number().int().optional(),
  /** Best-effort trailing snippet of session output at the failure; may be null. */
  lastOutput: z.string().nullable().optional(),
  /** The task's `retryCount` when this failure occurred. */
  retryIndex: z.number().int().nonnegative(),
  /** teamId this failure's task belongs to; null for personal tasks. */
  teamId: z.string().optional(),
  at: z.string(),
});
export type TaskFailure = z.infer<typeof TaskFailureSchema>;

/**
 * Typed reason a task is parked in `waiting` for a human (Theme D escalation
 * reuses `waiting` rather than adding a status — Decision §1). Defined here in
 * Theme A so the failure sites and the board share one vocabulary; A only
 * records failures, D wires these onto the transition.
 */
export const WAIT_REASONS = [
  'needs-input',
  'no-pr',
  'agent-failed',
  'timed-out',
  'gate-failed',
  'retries-exhausted',
] as const;

export const WaitReasonSchema = z.enum(WAIT_REASONS);
export type WaitReason = z.infer<typeof WaitReasonSchema>;

/** Human labels for wait reasons (board chips, notifications, CLI). */
export const WAIT_REASON_LABEL: Record<WaitReason, string> = {
  'needs-input': 'Needs input',
  'no-pr': 'No PR opened',
  'agent-failed': 'Agent failed',
  'timed-out': 'Timed out',
  'gate-failed': 'Gate failed',
  'retries-exhausted': 'Retries exhausted',
};

/**
 * Whether a `waiting` task's reason means "a failure escalated this to a human"
 * (Phase 53 D) rather than the agent blocking on live user input (`needs-input`).
 * The board derives its "needs attention" grouping from this; the nudge service
 * only reminds on these.
 */
export function isNeedsAttention(reason: WaitReason | null | undefined): boolean {
  return reason != null && reason !== 'needs-input';
}

/** How a human resolves a needs-attention task (Phase 53 D). `replan` requeues
 *  with a fresh prompt; `requeue` re-runs as-is; `abandon` is the explicit
 *  give-up terminal. */
export const RESOLVE_TASK_ACTIONS = ['requeue', 'replan', 'abandon'] as const;
export const ResolveTaskActionSchema = z.enum(RESOLVE_TASK_ACTIONS);
export type ResolveTaskAction = z.infer<typeof ResolveTaskActionSchema>;

export const ResolveTaskRequestSchema = z
  .object({
    action: ResolveTaskActionSchema,
    /** New prompt for a `replan`; required for `replan`, ignored otherwise. */
    prompt: z.string().trim().min(1).max(20_000).optional(),
  })
  .refine((v) => v.action !== 'replan' || !!v.prompt, {
    message: 'replan requires a prompt',
    path: ['prompt'],
  });
export type ResolveTaskRequest = z.infer<typeof ResolveTaskRequestSchema>;

import { z } from 'zod';

// Quality-gate contract (Phase 30). A "check" is a user-configured shell command
// the gateway runs in a task's repo cwd before the `done` transition; a "run" is
// one execution of a task's whole check set. These shapes are the contract shared
// by the gateway runner, the config block, and (later) the CLI/web surfaces.
// shared owns no execution — that's the gateway ChecksService.

/** A single configured check: a shell command run in the task's repo cwd. */
export const CheckSchema = z.object({
  name: z.string(),
  command: z.string(),
  /** Repo-relative working directory for this check; defaults to the repo root. */
  cwd: z.string().optional(),
  /** Per-check timeout override; falls back to `checks.perCheckTimeoutMs`. */
  timeoutMs: z.number().int().positive().optional(),
});
export type Check = z.infer<typeof CheckSchema>;

/** Auto-fix loop config (Theme C) — re-spawn the agent on a failed gate. */
export const ChecksAutoFixConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxAttempts: z.number().int().positive().default(2),
});
export type ChecksAutoFixConfig = z.infer<typeof ChecksAutoFixConfigSchema>;

/**
 * The `checks` config block — a blocking gate run before a task's `done`
 * transition. Optional + fully defaulted so existing `midnite.json` keeps
 * validating; opt in with `enabled: true` and a non-empty `gates` (or `byRepo`).
 */
export const ChecksConfigSchema = z.object({
  enabled: z.boolean().default(false),
  /** Checks applied to any repo by default. */
  gates: z.array(CheckSchema).default([]),
  /** Per-repo-name overrides — REPLACE `gates` for that repo, not merged (Decision §5). */
  byRepo: z.record(z.string(), z.array(CheckSchema)).default({}),
  autoFix: ChecksAutoFixConfigSchema.default({}),
  /** Timeout per check when a Check sets no `timeoutMs` (default 10 min). */
  perCheckTimeoutMs: z.number().int().positive().default(600_000),
  /** Captured stdout+stderr is tail-truncated to ~this many bytes (+ a short marker; default 16 KiB). */
  outputCapBytes: z.number().int().positive().default(16_384),
});
export type ChecksConfig = z.infer<typeof ChecksConfigSchema>;

/** How a check run was triggered. */
export const CheckTriggerSchema = z.enum(['gate', 'manual', 'auto-fix']);
export type CheckTrigger = z.infer<typeof CheckTriggerSchema>;

/** The outcome of running one check. */
export const CheckResultSchema = z.object({
  name: z.string(),
  command: z.string(),
  /** Process exit code; `null` when the check was killed (timeout) or never spawned. */
  exitCode: z.number().int().nullable(),
  passed: z.boolean(),
  durationMs: z.number().int().nonnegative(),
  /** Combined stdout+stderr, tail-truncated to `checks.outputCapBytes`. */
  output: z.string(),
});
export type CheckResult = z.infer<typeof CheckResultSchema>;

/** One run of a task's full check set. */
export const CheckRunSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  trigger: CheckTriggerSchema,
  startedAt: z.string(),
  finishedAt: z.string(),
  passed: z.boolean(),
  results: z.array(CheckResultSchema),
});
export type CheckRun = z.infer<typeof CheckRunSchema>;

/**
 * Derived board affordance for a task's latest check run — there is no new task
 * status (Decision §3); this is computed from the latest run + a task event.
 * `verifying` while a gate run is in flight, `failing` when the latest gate run
 * failed and the task isn't `done`, `passed` otherwise.
 */
export const CheckRunStatusSchema = z.enum(['verifying', 'passed', 'failing']);
export type CheckRunStatus = z.infer<typeof CheckRunStatusSchema>;

/** Response shape for `GET /tasks/:id/check-runs`. */
export const CheckRunListResponseSchema = z.object({ runs: z.array(CheckRunSchema) });
export type CheckRunListResponse = z.infer<typeof CheckRunListResponseSchema>;

/** Response shape for `POST /tasks/:id/check`. */
export const TriggerCheckResponseSchema = z.object({ run: CheckRunSchema });
export type TriggerCheckResponse = z.infer<typeof TriggerCheckResponseSchema>;

/**
 * Which checks apply to a repo: the per-repo override if present, else the global
 * `gates`. `byRepo` REPLACES `gates` for a named repo (Decision §5) — it does not
 * merge. A repo-less task (`repoName` null/undefined) gets the global gates. Pure
 * so the gateway and any client agree on which checks apply.
 */
export function resolveChecksForRepo(
  checks: ChecksConfig,
  repoName: string | null | undefined,
): Check[] {
  const override = repoName ? checks.byRepo[repoName] : undefined;
  return override ?? checks.gates;
}

// ── Wire shapes for Phase 30 D surfaces ─────────────────────────────────────

/** Response from `POST /tasks/:id/check` — the triggered run. */
export const TriggerCheckResponseSchema = z.object({ run: CheckRunSchema });
export type TriggerCheckResponse = z.infer<typeof TriggerCheckResponseSchema>;

/** Response from `GET /tasks/:id/check-runs` — ordered oldest-first. */
export const CheckRunListResponseSchema = z.object({ runs: z.array(CheckRunSchema) });
export type CheckRunListResponse = z.infer<typeof CheckRunListResponseSchema>;

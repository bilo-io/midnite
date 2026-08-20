import { z } from 'zod';
import { isHexColor } from './color.js';
import { StatusSchema, TaskSchema, pagedSchema } from './task.js';

export const MAX_TAG_LENGTH = 12;

export const HexColorSchema = z
  .string()
  .refine((v) => isHexColor(v), { message: 'must be a hex color like #7c3aed' });

export const TagSchema = z
  .string()
  .trim()
  .min(1, 'tag is required')
  .max(MAX_TAG_LENGTH, `tag must be ${MAX_TAG_LENGTH} characters or fewer`);

/**
 * Phase 58 Theme C: per-status task counts for a project — computed server-side
 * (never stored), so the completion overlay can't drift from the board. A partial
 * map: statuses with zero tasks are omitted.
 */
export const TaskStatusCountsSchema = z.record(StatusSchema, z.number().int().nonnegative());

// The folder Claude Code sessions for this project spawn in. Stored in `~`-form
// (the gateway collapses the home prefix); empty/omitted means "no fixed dir".
const WorkDirSchema = z.string().trim().max(1024);

/**
 * One repo attached to a project (Phase 84 Theme C). Derived from the
 * `project_repos` edges and denormalised with the repo's own `name`/`path` so a
 * consumer never needs a second lookup — mirroring how Phase 27 derives a task's
 * `dependsOn` rather than storing it on the row.
 *
 * Exactly one edge per project carries `isPrimary`, and the primary repo's path
 * is the project's **effective working directory** — `project.workDir` remains
 * the stored column and the fallback for a project with no repos attached.
 */
export const ProjectRepoSchema = z.object({
  repoId: z.string(),
  name: z.string(),
  /** Repo path in `~`-form, as stored in the registry. */
  path: z.string(),
  isPrimary: z.boolean(),
  /** GitHub `owner/repo` slug, when the registry knows one. */
  ownerRepo: z.string().optional(),
  attachedAt: z.string(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tag: TagSchema,
  color: HexColorSchema,
  workDir: z.string().optional(),
  /** Command that runs the project's dev/preview server, in `workDir`. */
  startCommand: z.string().optional(),
  /** Command that builds the project, in `workDir`. */
  buildCommand: z.string().optional(),
  plan: z.string().optional(),
  planUpdatedAt: z.string().optional(),
  archived: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  taskCount: z.number().int().nonnegative().optional(),
  /**
   * Phase 58 Theme C: per-status task counts (computed, not stored). Drives the
   * per-project completion overlay on project surfaces. Absent → no tasks known.
   */
  taskStatusCounts: TaskStatusCountsSchema.optional(),
  /** Phase 38: team this project belongs to; null for personal projects. */
  teamId: z.string().optional(),
  /**
   * Phase 84 Theme C: the repos attached to this project, derived from the
   * `project_repos` edges (never stored on the row). The gateway hydrates it on
   * both the list and detail reads via one batched query, so in practice it is
   * always populated; `optional` rather than defaulted to match how Phase 27
   * derives a task's `dependsOn` — and so the ~14 existing `Project` fixtures
   * across web/admin don't all have to declare an empty array.
   */
  repos: z.array(ProjectRepoSchema).optional(),
});

export const CreateProjectRequestSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  description: z.string().max(8000).optional(),
  tag: TagSchema,
  color: HexColorSchema,
  workDir: WorkDirSchema.optional(),
  startCommand: z.string().trim().max(2000).optional(),
  buildCommand: z.string().trim().max(2000).optional(),
});

export const UpdateProjectRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(8000).optional(),
  tag: TagSchema.optional(),
  color: HexColorSchema.optional(),
  // Empty string clears the configured directory.
  workDir: WorkDirSchema.optional(),
  // Empty string clears the configured command.
  startCommand: z.string().trim().max(2000).optional(),
  buildCommand: z.string().trim().max(2000).optional(),
  archived: z.boolean().optional(),
});

/** Attach a registered repo to a project (`POST /projects/:id/repos`). */
export const AttachProjectRepoRequestSchema = z.object({
  repoId: z.string().min(1, 'repoId is required'),
  /**
   * Make this the project's primary repo. Omitted/false still promotes it when
   * the project has no repos yet — a project with repos always has exactly one
   * primary, maintained server-side.
   */
  primary: z.boolean().optional(),
});

/**
 * Promote a repo to primary (`PATCH /projects/:id/repos/:repoId`). Only `true`
 * is meaningful: demoting without naming a successor would leave the project
 * with no primary, so the service rejects `false` — promote another repo instead.
 */
export const SetProjectRepoPrimaryRequestSchema = z.object({
  isPrimary: z.boolean(),
});

export const EnhanceDescriptionRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  description: z.string().trim().min(1, 'description is required').max(8000),
});

export const EnhanceDescriptionResponseSchema = z.object({
  description: z.string(),
});

export const DraftPlanResponseSchema = z.object({
  plan: z.string(),
  planUpdatedAt: z.string(),
});

/**
 * Local git status for a project's `workDir` (no remote/clone support — scope is
 * deliberately narrow). `exists`/`isRepo` are always present; the rest describe a
 * usable repo. `error` carries a git-command failure (e.g. detached HEAD, corrupt
 * repo) without failing the whole response.
 */
export const RepoStatusResponseSchema = z.object({
  exists: z.boolean(),
  isRepo: z.boolean(),
  branch: z.string().optional(),
  dirty: z.boolean().optional(),
  error: z.string().optional(),
});

/**
 * Optional body for `POST /projects/:id/preview` and `/build`. `background: true`
 * runs the command as a gateway-owned child process (a pinned managed-run PTY —
 * never idle-reaped, dies with the gateway) instead of a lazy ad-hoc terminal
 * that only spawns once a client attaches. No body / `{}` keeps the terminal
 * behaviour, so existing callers are unchanged.
 */
export const RunProjectCommandRequestSchema = z.object({
  background: z.boolean().optional(),
});

export const UpdatePlanRequestSchema = z.object({
  plan: z.string().max(50000),
});

export const CreatePlanTasksRequestSchema = z.object({
  titles: z.array(z.string().trim().min(1)).min(1).max(100),
});

export const CreatePlanTasksResponseSchema = z.object({
  tasks: z.array(TaskSchema),
});

/**
 * Draft-plan Stage 1 (execution-plan overview, drafted live in a PTY — see
 * `ProjectPlanRunnerService`). `docIds` are the project's docs (Phase — project
 * docs are gateway-persisted) whose content is woven into the overview prompt;
 * an empty array drafts from the project's name/description/plan alone.
 */
export const StartOverviewRunRequestSchema = z.object({
  docIds: z.array(z.string()).default([]),
});

export const StartOverviewRunResponseSchema = z.object({
  runId: z.string(),
  terminalId: z.string(),
});

export const OverviewRunStatusSchema = z.enum(['running', 'done', 'error']);

/** Polled while the overview PTY is live; terminal once `status` settles. */
export const OverviewRunResponseSchema = z.object({
  status: OverviewRunStatusSchema,
  output: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Request body for `POST /projects/:id/plan/draft-breakdown`. `overview` is the
 * Stage 1 approved execution-plan overview, woven into the breakdown's context
 * alongside the project's description/plan when present. Both fields optional —
 * the route previously took no body at all.
 */
export const DraftBreakdownRequestSchema = z.object({
  overview: z.string().optional(),
});

export const ProjectResponseSchema = z.object({ project: ProjectSchema });

// The things a project needs to be considered "complete". `name`, `tag` and
// `color` are mandatory at creation, but `folder` (workDir) is filled in
// afterwards — so a folder-less project starts out incomplete.
export const PROJECT_REQUIREMENTS = ['name', 'tag', 'folder'] as const;
export type ProjectRequirement = (typeof PROJECT_REQUIREMENTS)[number];

/** The requirements a project is still missing (empty array means complete). */
export function missingProjectRequirements(project: Project): ProjectRequirement[] {
  const missing: ProjectRequirement[] = [];
  if (!project.name.trim()) missing.push('name');
  if (!project.tag.trim() || !project.color.trim()) missing.push('tag');
  if (!project.workDir || !project.workDir.trim()) missing.push('folder');
  return missing;
}

/**
 * Phase 58 Theme C: a project's completion, derived from its per-status counts.
 * `total` counts **every** assigned task (abandoned included — a project isn't
 * 100% if work was abandoned); `done` is the terminal `done` count. When
 * `taskStatusCounts` is absent we fall back to `taskCount` for the total (with
 * `done` unknown → 0), so surfaces that only have the count still render safely.
 */
export type ProjectCompletion = { done: number; total: number; pct: number };

export function projectCompletion(
  project: Pick<Project, 'taskStatusCounts' | 'taskCount'>,
): ProjectCompletion {
  const counts = project.taskStatusCounts;
  const total = counts
    ? Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0)
    : (project.taskCount ?? 0);
  const done = counts?.done ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

/**
 * A project's **effective working directory** (Phase 84 Theme C): the primary
 * repo's path when repos are attached, otherwise the stored `workDir`.
 *
 * The primary repo wins because attaching repos is the more specific, more
 * recent statement of where a project lives; `workDir` remains the fallback so a
 * project with no repos behaves exactly as it always has. The boot backfill
 * seeds each existing project's `workDir` as its primary repo, so nothing moves
 * for an install that already worked.
 */
export function effectiveWorkDir(
  project: Pick<Project, 'workDir' | 'repos'>,
): string | undefined {
  const primary = project.repos?.find((r) => r.isPrimary);
  return primary?.path ?? (project.workDir?.trim() ? project.workDir : undefined);
}

export type TaskStatusCounts = z.infer<typeof TaskStatusCountsSchema>;
export type ProjectRepo = z.infer<typeof ProjectRepoSchema>;
export type Project = z.infer<typeof ProjectSchema>;

/** A page of projects (Phase 57 C follow-up): `{ items, total }`. Keeps the full
 *  `Project` shape (a lean `ProjectSummary` is a separate future slice). */
export const ProjectsPageSchema = pagedSchema(ProjectSchema);
export type ProjectsPage = z.infer<typeof ProjectsPageSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type EnhanceDescriptionRequest = z.infer<typeof EnhanceDescriptionRequestSchema>;
export type EnhanceDescriptionResponse = z.infer<typeof EnhanceDescriptionResponseSchema>;
export type DraftPlanResponse = z.infer<typeof DraftPlanResponseSchema>;
export type RepoStatusResponse = z.infer<typeof RepoStatusResponseSchema>;
export type AttachProjectRepoRequest = z.infer<typeof AttachProjectRepoRequestSchema>;
export type SetProjectRepoPrimaryRequest = z.infer<typeof SetProjectRepoPrimaryRequestSchema>;
export type RunProjectCommandRequest = z.infer<typeof RunProjectCommandRequestSchema>;
export type UpdatePlanRequest = z.infer<typeof UpdatePlanRequestSchema>;
export type CreatePlanTasksRequest = z.infer<typeof CreatePlanTasksRequestSchema>;
export type CreatePlanTasksResponse = z.infer<typeof CreatePlanTasksResponseSchema>;
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
export type StartOverviewRunRequest = z.infer<typeof StartOverviewRunRequestSchema>;
export type StartOverviewRunResponse = z.infer<typeof StartOverviewRunResponseSchema>;
export type OverviewRunStatus = z.infer<typeof OverviewRunStatusSchema>;
export type OverviewRunResponse = z.infer<typeof OverviewRunResponseSchema>;
export type DraftBreakdownRequest = z.infer<typeof DraftBreakdownRequestSchema>;

import { z } from 'zod';
import { isHexColor } from './color.js';
import { StatusSchema, TaskSchema, pagedSchema } from './task.js';

export const MAX_TAG_LENGTH = 12;

const HexColorSchema = z
  .string()
  .refine((v) => isHexColor(v), { message: 'must be a hex color like #7c3aed' });

const TagSchema = z
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

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tag: TagSchema,
  color: HexColorSchema,
  workDir: z.string().optional(),
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
   * Phase 40 Theme G: phase-doc ↔ board sync-back. When enabled (default on) and a
   * sync repo is set, completing a seeded task ticks its checkbox in the repo `.md`.
   */
  phaseDocSync: z.boolean().optional(),
  /** Repo (registry id) whose `.midnite/phases/*.md` receive sync-back ticks; null = unset. */
  phaseDocSyncRepoId: z.string().nullable().optional(),
});

export const CreateProjectRequestSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  description: z.string().max(8000).optional(),
  tag: TagSchema,
  color: HexColorSchema,
  workDir: WorkDirSchema.optional(),
});

export const UpdateProjectRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(8000).optional(),
  tag: TagSchema.optional(),
  color: HexColorSchema.optional(),
  // Empty string clears the configured directory.
  workDir: WorkDirSchema.optional(),
  archived: z.boolean().optional(),
  /** Phase 40 Theme G: toggle phase-doc sync-back for this project. */
  phaseDocSync: z.boolean().optional(),
  // Empty string clears the sync repo.
  phaseDocSyncRepoId: z.string().optional(),
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

export const UpdatePlanRequestSchema = z.object({
  plan: z.string().max(50000),
});

export const CreatePlanTasksRequestSchema = z.object({
  titles: z.array(z.string().trim().min(1)).min(1).max(100),
});

export const CreatePlanTasksResponseSchema = z.object({
  tasks: z.array(TaskSchema),
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

export type TaskStatusCounts = z.infer<typeof TaskStatusCountsSchema>;
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
export type UpdatePlanRequest = z.infer<typeof UpdatePlanRequestSchema>;
export type CreatePlanTasksRequest = z.infer<typeof CreatePlanTasksRequestSchema>;
export type CreatePlanTasksResponse = z.infer<typeof CreatePlanTasksResponseSchema>;
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

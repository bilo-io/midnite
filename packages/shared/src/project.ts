import { z } from 'zod';
import { isHexColor } from './color.js';
import { SOURCE_KINDS } from './source.js';
import { TaskSchema } from './task.js';

export const MAX_SOURCES_PER_PROJECT = 10;
export const MAX_TAG_LENGTH = 12;

export const SourceKindSchema = z.enum(SOURCE_KINDS);

const HexColorSchema = z
  .string()
  .refine((v) => isHexColor(v), { message: 'must be a hex color like #7c3aed' });

const TagSchema = z
  .string()
  .trim()
  .min(1, 'tag is required')
  .max(MAX_TAG_LENGTH, `tag must be ${MAX_TAG_LENGTH} characters or fewer`);

export const ProjectSourceSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  url: z.string().url(),
  kind: SourceKindSchema,
  title: z.string().optional(),
  faviconUrl: z.string().optional(),
  fetchedAt: z.string().optional(),
  createdAt: z.string(),
});

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
  sources: z.array(ProjectSourceSchema),
  taskCount: z.number().int().nonnegative().optional(),
  /** Phase 38: team this project belongs to; null for personal projects. */
  teamId: z.string().optional(),
  /** Phase 40: idea this project was promoted from; null if not idea-originated. */
  ideaId: z.string().nullable().optional(),
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
  sources: z.array(z.string().url()).max(MAX_SOURCES_PER_PROJECT).optional(),
  /** Phase 40: set when the project is created by promoting an idea. */
  ideaId: z.string().optional(),
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

export const AddSourceRequestSchema = z.object({
  url: z.string().url(),
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

export type ProjectSource = z.infer<typeof ProjectSourceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type AddSourceRequest = z.infer<typeof AddSourceRequestSchema>;
export type EnhanceDescriptionRequest = z.infer<typeof EnhanceDescriptionRequestSchema>;
export type EnhanceDescriptionResponse = z.infer<typeof EnhanceDescriptionResponseSchema>;
export type DraftPlanResponse = z.infer<typeof DraftPlanResponseSchema>;
export type UpdatePlanRequest = z.infer<typeof UpdatePlanRequestSchema>;
export type CreatePlanTasksRequest = z.infer<typeof CreatePlanTasksRequestSchema>;
export type CreatePlanTasksResponse = z.infer<typeof CreatePlanTasksResponseSchema>;
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

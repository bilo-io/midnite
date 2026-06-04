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

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tag: TagSchema,
  color: HexColorSchema,
  plan: z.string().optional(),
  planUpdatedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sources: z.array(ProjectSourceSchema),
  taskCount: z.number().int().nonnegative().optional(),
});

export const CreateProjectRequestSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  description: z.string().max(8000).optional(),
  tag: TagSchema,
  color: HexColorSchema,
  sources: z.array(z.string().url()).max(MAX_SOURCES_PER_PROJECT).optional(),
});

export const UpdateProjectRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(8000).optional(),
  tag: TagSchema.optional(),
  color: HexColorSchema.optional(),
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

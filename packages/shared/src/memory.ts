import { z } from 'zod';
import { SOURCE_KINDS } from './source.js';

// Memories: markdown knowledge entries injected into agent prompts. Each memory
// is either global (projectId null — applies to every project) or scoped to a
// single project. Distinct from sources (links): a memory is authored content,
// editable in place. A memory may also carry reference sources (links) of its
// own, mirroring project sources.

export const MAX_MEMORY_TITLE = 120;
export const MAX_MEMORY_CONTENT = 50_000;
export const MAX_SOURCES_PER_MEMORY = 10;

// A reference link attached to a memory. Mirrors ProjectSource, scoped to a
// memory instead of a project.
export const MemorySourceSchema = z.object({
  id: z.string(),
  memoryId: z.string(),
  url: z.string().url(),
  kind: z.enum(SOURCE_KINDS),
  title: z.string().optional(),
  faviconUrl: z.string().optional(),
  fetchedAt: z.string().optional(),
  createdAt: z.string(),
});

export const MemorySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  // null = global; otherwise the id of the project this memory is scoped to.
  projectId: z.string().nullable(),
  sources: z.array(MemorySourceSchema),
  archived: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateMemoryRequestSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(MAX_MEMORY_TITLE),
  content: z.string().max(MAX_MEMORY_CONTENT).default(''),
  projectId: z.string().nullable().optional(),
  // URLs staged in the create modal; added as sources after the memory exists.
  sources: z.array(z.string().url()).max(MAX_SOURCES_PER_MEMORY).optional(),
});

export const AddMemorySourceRequestSchema = z.object({
  url: z.string().url(),
});

export const UpdateMemoryRequestSchema = z.object({
  title: z.string().trim().min(1).max(MAX_MEMORY_TITLE).optional(),
  content: z.string().max(MAX_MEMORY_CONTENT).optional(),
  // Omitted = unchanged; explicit null re-scopes the memory to global.
  projectId: z.string().nullable().optional(),
  archived: z.boolean().optional(),
});

export const MemoryResponseSchema = z.object({ memory: MemorySchema });
export const MemoriesResponseSchema = z.object({ memories: z.array(MemorySchema) });

export type MemorySource = z.infer<typeof MemorySourceSchema>;
export type Memory = z.infer<typeof MemorySchema>;
export type CreateMemoryRequest = z.infer<typeof CreateMemoryRequestSchema>;
export type UpdateMemoryRequest = z.infer<typeof UpdateMemoryRequestSchema>;
export type AddMemorySourceRequest = z.infer<typeof AddMemorySourceRequestSchema>;
export type MemoryResponse = z.infer<typeof MemoryResponseSchema>;
export type MemoriesResponse = z.infer<typeof MemoriesResponseSchema>;

import { z } from 'zod';

// Memories: markdown knowledge entries injected into agent prompts. Each memory
// is either global (projectId null — applies to every project) or scoped to a
// single project. Distinct from sources (links): a memory is authored content,
// editable in place.

export const MAX_MEMORY_TITLE = 120;
export const MAX_MEMORY_CONTENT = 50_000;

export const MemorySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  // null = global; otherwise the id of the project this memory is scoped to.
  projectId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateMemoryRequestSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(MAX_MEMORY_TITLE),
  content: z.string().max(MAX_MEMORY_CONTENT).default(''),
  projectId: z.string().nullable().optional(),
});

export const UpdateMemoryRequestSchema = z.object({
  title: z.string().trim().min(1).max(MAX_MEMORY_TITLE).optional(),
  content: z.string().max(MAX_MEMORY_CONTENT).optional(),
  // Omitted = unchanged; explicit null re-scopes the memory to global.
  projectId: z.string().nullable().optional(),
});

export const MemoryResponseSchema = z.object({ memory: MemorySchema });
export const MemoriesResponseSchema = z.object({ memories: z.array(MemorySchema) });

export type Memory = z.infer<typeof MemorySchema>;
export type CreateMemoryRequest = z.infer<typeof CreateMemoryRequestSchema>;
export type UpdateMemoryRequest = z.infer<typeof UpdateMemoryRequestSchema>;
export type MemoryResponse = z.infer<typeof MemoryResponseSchema>;
export type MemoriesResponse = z.infer<typeof MemoriesResponseSchema>;

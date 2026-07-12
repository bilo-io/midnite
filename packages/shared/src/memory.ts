import { z } from 'zod';
import { SOURCE_KINDS } from './source.js';

// Memories: markdown knowledge entries injected into agent prompts. Each memory
// is either global (projectId null — applies to every project) or scoped to a
// single project. Distinct from sources (links): a memory is authored content,
// editable in place. A memory may also carry reference sources (links) of its
// own, mirroring project sources.

export const MAX_MEMORY_TITLE = 120;
export const MAX_MEMORY_CONTENT = 50_000;
export const MAX_SOURCES_PER_MEMORY = 25;

// Phase 65 B — source-content ingestion caps.
/** Max extracted text kept per source (the chat/generation grounding corpus). */
export const MAX_SOURCE_TEXT_BYTES = 200_000;
/** Max size of an uploaded source file. Kept just under the gateway's 8 MB
 *  multipart limit (bootstrap.ts) so an oversize upload gets a clean 400, not a
 *  framework-level 413. */
export const MAX_SOURCE_UPLOAD_BYTES = 8_000_000;
/** Upload types we can extract text from. */
export const SOURCE_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'text/markdown',
  'text/plain',
] as const;

// Ingestion lifecycle for a source's extracted text. `null` = not yet ingested
// (e.g. a link added before Phase 65 B, or an upload still landing).
export const SourceIngestStateSchema = z.enum(['pending', 'ready', 'failed']);
export type SourceIngestState = z.infer<typeof SourceIngestStateSchema>;

// A source attached to a memory — either a reference **link** (`url`) or an
// uploaded **file** (`kind: 'file'`, `fileName`/`mimeType`). Its readable text is
// ingested best-effort (Phase 65 B) for chat + Studio to ground on; the full text
// lives server-side, not in this client shape (only its ingest status surfaces).
export const MemorySourceSchema = z.object({
  id: z.string(),
  memoryId: z.string(),
  // Optional: a file source has no URL (it's an upload).
  url: z.string().url().optional(),
  kind: z.enum(SOURCE_KINDS),
  title: z.string().optional(),
  faviconUrl: z.string().optional(),
  fetchedAt: z.string().optional(),
  createdAt: z.string(),
  // Uploaded-file metadata (present only when kind === 'file').
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  // Ingestion status (not the text itself). null/undefined = not ingested.
  ingestState: SourceIngestStateSchema.nullable().optional(),
  ingestError: z.string().nullable().optional(),
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

// A single source's extracted/scraped text (Phase 65 B stores it server-side; the
// `MemorySource` wire shape deliberately omits it). Fetched on demand when the UI
// opens a source's detail view. `text` is null when the source was never ingested
// or no readable text could be extracted.
export const MemorySourceContentSchema = z.object({
  id: z.string(),
  ingestState: SourceIngestStateSchema.nullable(),
  ingestError: z.string().nullable(),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  byteSize: z.number().optional(),
  text: z.string().nullable(),
});

export const MemorySourceContentResponseSchema = z.object({
  content: MemorySourceContentSchema,
});

// --- Phase 65 C: chat to the knowledge base ---

/** Longest question a single chat turn may carry. */
export const MAX_MEMORY_CHAT_MESSAGE = 4_000;

export const MemoryChatRoleSchema = z.enum(['user', 'assistant']);
export type MemoryChatRole = z.infer<typeof MemoryChatRoleSchema>;

// One turn in a memory's single running chat thread (Decision §8 — one thread per
// memory). Assistant turns carry `citations` (the ids of the memory sources the
// answer drew on) so the UI can chip-link them; `error` marks a graceful failure
// turn (LLM unavailable / call failed) rather than a real answer.
export const MemoryChatMessageSchema = z.object({
  id: z.string(),
  memoryId: z.string(),
  role: MemoryChatRoleSchema,
  content: z.string(),
  citations: z.array(z.string()).default([]),
  error: z.boolean().optional(),
  createdAt: z.string(),
});

export const PostMemoryChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'message is required').max(MAX_MEMORY_CHAT_MESSAGE),
});

/** Full ordered thread for a memory (oldest first). */
export const MemoryChatHistoryResponseSchema = z.object({
  messages: z.array(MemoryChatMessageSchema),
});

/** The two turns a POST appends: the user's question + the assistant's reply. */
export const PostMemoryChatResponseSchema = z.object({
  userMessage: MemoryChatMessageSchema,
  assistantMessage: MemoryChatMessageSchema,
});

export type MemorySource = z.infer<typeof MemorySourceSchema>;
export type SourceUploadMimeType = (typeof SOURCE_UPLOAD_MIME_TYPES)[number];
export type Memory = z.infer<typeof MemorySchema>;
export type CreateMemoryRequest = z.infer<typeof CreateMemoryRequestSchema>;
export type UpdateMemoryRequest = z.infer<typeof UpdateMemoryRequestSchema>;
export type AddMemorySourceRequest = z.infer<typeof AddMemorySourceRequestSchema>;
export type MemoryResponse = z.infer<typeof MemoryResponseSchema>;
export type MemoriesResponse = z.infer<typeof MemoriesResponseSchema>;
export type MemorySourceContent = z.infer<typeof MemorySourceContentSchema>;
export type MemorySourceContentResponse = z.infer<typeof MemorySourceContentResponseSchema>;
export type MemoryChatMessage = z.infer<typeof MemoryChatMessageSchema>;
export type PostMemoryChatRequest = z.infer<typeof PostMemoryChatRequestSchema>;
export type MemoryChatHistoryResponse = z.infer<typeof MemoryChatHistoryResponseSchema>;
export type PostMemoryChatResponse = z.infer<typeof PostMemoryChatResponseSchema>;

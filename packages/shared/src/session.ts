import { z } from 'zod';
import { TaskEventSchema } from './task.js';
import { LlmProviderSchema } from './llm.js';

export const SESSION_STATUSES = ['running', 'waiting', 'completed', 'idle'] as const;
export const SessionStatusSchema = z.enum(SESSION_STATUSES);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSummarySchema = z.object({
  id: z.string(),
  projectSlug: z.string(),
  projectDisplay: z.string(),
  title: z.string(),
  subtitle: z.string(),
  status: SessionStatusSchema,
  lastActivity: z.number(),
  linkedTaskId: z.string().optional(),
  contextTokens: z.number().int().nonnegative().optional(),
  contextLimit: z.number().int().positive().optional(),
  /** ISO timestamp when the session was archived; absent when active. */
  archivedAt: z.string().optional(),
  /** The agent CLI driving this session (claude | gemini | codex | …). */
  agentCli: z.string().optional(),
  /** LLM provider backing this session (derived from agentCli). */
  provider: LlmProviderSchema.optional(),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

/**
 * The session detail page's shape (Phase 51 A) — a `SessionSummary` plus the few
 * extra fields the cockpit shows, threaded from the linked task/transcript in the
 * service. `contextEstimate` flags that `contextTokens`/`contextLimit` are a
 * hash-seeded approximation, not a real token count (Decision §4).
 */
export const SessionDetailSchema = SessionSummarySchema.extend({
  /** ISO timestamp the underlying task was created — the uptime source. */
  createdAt: z.string().optional(),
  /** Retry count of the linked task. */
  retryCount: z.number().int().nonnegative().optional(),
  /** Working directory (from the transcript), when known. */
  cwd: z.string().optional(),
  /** True when `contextTokens`/`contextLimit` are an estimate, not measured. */
  contextEstimate: z.boolean().optional(),
});
export type SessionDetail = z.infer<typeof SessionDetailSchema>;

export const SessionDetailResponseSchema = z.object({ session: SessionDetailSchema });
export type SessionDetailResponse = z.infer<typeof SessionDetailResponseSchema>;

export const TranscriptToolCallSchema = z.object({
  name: z.string(),
  summary: z.string(),
});

export const TranscriptMessageSchema = z.object({
  uuid: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  timestamp: z.number(),
  text: z.string(),
  toolCalls: z.array(TranscriptToolCallSchema).optional(),
});
export type TranscriptMessage = z.infer<typeof TranscriptMessageSchema>;

export const SessionTranscriptSchema = z.object({
  id: z.string(),
  title: z.string(),
  projectDisplay: z.string(),
  status: SessionStatusSchema,
  cwd: z.string().optional(),
  gitBranch: z.string().optional(),
  messages: z.array(TranscriptMessageSchema),
  taskEvents: z.array(TaskEventSchema).optional(),
});
export type SessionTranscript = z.infer<typeof SessionTranscriptSchema>;

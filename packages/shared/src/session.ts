import { z } from 'zod';
import { TaskEventSchema } from './task.js';

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
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

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

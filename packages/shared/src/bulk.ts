import { z } from 'zod';
import { StatusSchema, TaskKindSchema } from './task.js';

/**
 * Upper bound on the number of task lines a single bulk request may create.
 * Guards against a pasted document spawning thousands of classify calls
 * (Phase 16 Decision §3). Exceeding it is a 400, not a silent truncation.
 */
export const MAX_BULK_LINES = 200;

/**
 * Split a pasted blob into clean task prompts — one per line. Pure and
 * deterministic so the CLI and the web preview derive an identical list from the
 * same text. Drops blank lines and `#`-prefixed comments, and strips a leading
 * markdown list / checklist marker (`- `, `* `, `1. `, `- [ ] `) so a pasted
 * checklist becomes plain prompts. Parsing stays intentionally simple (Decision
 * §4): no inline metadata, no CSV/JSON.
 */
export function parseBulkLines(raw: string): string[] {
  const out: string[] = [];
  for (const rawLine of raw.split('\n')) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    // Strip a leading list/ordered marker, then a checklist box, then re-trim —
    // this order handles "- [ ] foo" (marker, then box) as well as "[x] foo".
    line = line.replace(/^([-*]|\d+[.)])\s+/, '');
    line = line.replace(/^\[[ xX]\]\s+/, '').trim();
    if (line) out.push(line);
  }
  return out;
}

// Create many tasks from one pasted blob. Carries the raw text OR a pre-parsed
// `lines` array (the web preview parses client-side via `parseBulkLines`), plus
// optional shared repo/project/priority applied to every created task.
export const BulkCreateTaskRequestSchema = z
  .object({
    raw: z.string().max(100_000).optional(),
    lines: z.array(z.string()).optional(),
    repo: z.string().optional(),
    projectId: z.string().optional(),
    priority: z.number().int().min(0).max(3).optional(),
  })
  .refine((b) => Boolean(b.raw && b.raw.length > 0) || Boolean(b.lines && b.lines.length > 0), {
    message: 'provide either raw text or a non-empty lines array',
  });

// Per-line outcome: a created task carries id/kind/status; a failed line carries
// the error. Partial failure is first-class (Decision §2) — one bad line never
// aborts the batch.
export const BulkLineResultSchema = z.object({
  line: z.string(),
  taskId: z.string().optional(),
  kind: TaskKindSchema.optional(),
  status: StatusSchema.optional(),
  error: z.string().optional(),
});

export const BulkCreateTaskResponseSchema = z.object({
  results: z.array(BulkLineResultSchema),
  counts: z.object({
    created: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
});

export type BulkCreateTaskRequest = z.infer<typeof BulkCreateTaskRequestSchema>;
export type BulkLineResult = z.infer<typeof BulkLineResultSchema>;
export type BulkCreateTaskResponse = z.infer<typeof BulkCreateTaskResponseSchema>;

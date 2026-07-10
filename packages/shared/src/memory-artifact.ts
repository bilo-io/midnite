import { z } from 'zod';

/**
 * Phase 65 D — Studio artifacts generated from a memory's corpus (its markdown +
 * its ingested sources). Text artifacts (brief / FAQ / study-guide / timeline)
 * render as markdown; the infographic is a single self-contained SVG. These live
 * in their own lightweight `memory_artifacts` table (not `Media`) because their
 * value is inline text/markup, not a file on disk — audio & video (Theme E) are
 * real files and belong to `Media`.
 */
export const MEMORY_ARTIFACT_KINDS = [
  'brief', // executive summary
  'faq', // Q&A distilled from the corpus
  'study-guide', // structured learning outline
  'timeline', // chronological summary
  'infographic', // single self-contained SVG visual summary
] as const;
export const MemoryArtifactKindSchema = z.enum(MEMORY_ARTIFACT_KINDS);
export type MemoryArtifactKind = z.infer<typeof MemoryArtifactKindSchema>;

/** How an artifact's `content` is rendered: markdown for text kinds, SVG markup. */
export const MEMORY_ARTIFACT_FORMATS = ['markdown', 'svg'] as const;
export const MemoryArtifactFormatSchema = z.enum(MEMORY_ARTIFACT_FORMATS);
export type MemoryArtifactFormat = z.infer<typeof MemoryArtifactFormatSchema>;

/** Async generation lifecycle on the persisted row (client polls for `ready`). */
export const MEMORY_ARTIFACT_STATUSES = ['pending', 'ready', 'failed'] as const;
export const MemoryArtifactStatusSchema = z.enum(MEMORY_ARTIFACT_STATUSES);
export type MemoryArtifactStatus = z.infer<typeof MemoryArtifactStatusSchema>;

/** Human labels + the rendered format for each artifact kind (one source of truth). */
export const MEMORY_ARTIFACT_META: Record<
  MemoryArtifactKind,
  { label: string; format: MemoryArtifactFormat }
> = {
  brief: { label: 'Executive brief', format: 'markdown' },
  faq: { label: 'FAQ', format: 'markdown' },
  'study-guide': { label: 'Study guide', format: 'markdown' },
  timeline: { label: 'Timeline', format: 'markdown' },
  infographic: { label: 'Infographic', format: 'svg' },
};

export const MemoryArtifactSchema = z.object({
  id: z.string(),
  memoryId: z.string(),
  kind: MemoryArtifactKindSchema,
  format: MemoryArtifactFormatSchema,
  title: z.string(),
  /** Markdown or SVG markup; empty until generation completes. */
  content: z.string(),
  status: MemoryArtifactStatusSchema,
  /** Populated when `status === 'failed'`; a human-readable reason. */
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MemoryArtifact = z.infer<typeof MemoryArtifactSchema>;

export const GenerateMemoryArtifactRequestSchema = z.object({
  kind: MemoryArtifactKindSchema,
});
export type GenerateMemoryArtifactRequest = z.infer<typeof GenerateMemoryArtifactRequestSchema>;

export const MemoryArtifactResponseSchema = z.object({ artifact: MemoryArtifactSchema });
export type MemoryArtifactResponse = z.infer<typeof MemoryArtifactResponseSchema>;

export const MemoryArtifactsResponseSchema = z.object({
  artifacts: z.array(MemoryArtifactSchema),
});
export type MemoryArtifactsResponse = z.infer<typeof MemoryArtifactsResponseSchema>;

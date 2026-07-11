import { z } from 'zod';

/**
 * Studio artifacts generated from a memory's corpus (its markdown + its ingested
 * sources), all persisted in one lightweight `memory_artifacts` table.
 *
 * - Phase 65 D — text kinds (brief / FAQ / study-guide / timeline) render as
 *   markdown; the infographic is a single self-contained SVG. Their value is
 *   inline text/markup in `content`.
 * - Phase 65 E — `audio-overview` (a two-host TTS podcast) and `video-overview`
 *   (a narrated slideshow) are *file-backed*: the rendered media lives in the
 *   uploads dir (`filePath`/`mimeType`/`fileSize`) while `content` keeps the
 *   generated script/outline as markdown. When no TTS/ffmpeg provider is
 *   available the artifact still completes `ready` but `degraded` is set and no
 *   file is produced — the script/outline is the honest fallback (Decision §1).
 */
export const MEMORY_ARTIFACT_KINDS = [
  'brief', // executive summary
  'faq', // Q&A distilled from the corpus
  'study-guide', // structured learning outline
  'timeline', // chronological summary
  'infographic', // single self-contained SVG visual summary
  'audio-overview', // two-host TTS podcast (file-backed; script fallback)
  'video-overview', // narrated slideshow (file-backed; outline fallback)
] as const;
export const MemoryArtifactKindSchema = z.enum(MEMORY_ARTIFACT_KINDS);
export type MemoryArtifactKind = z.infer<typeof MemoryArtifactKindSchema>;

/**
 * How an artifact renders: `markdown` for text kinds, `svg` markup for the
 * infographic, `audio`/`video` for the file-backed Theme E kinds (the player
 * streams `filePath`; `content` holds the script/outline markdown alongside).
 */
export const MEMORY_ARTIFACT_FORMATS = ['markdown', 'svg', 'audio', 'video'] as const;
export const MemoryArtifactFormatSchema = z.enum(MEMORY_ARTIFACT_FORMATS);
export type MemoryArtifactFormat = z.infer<typeof MemoryArtifactFormatSchema>;

/** File-backed formats stream a media file; the rest carry inline `content` only. */
export function isFileBackedFormat(format: MemoryArtifactFormat): boolean {
  return format === 'audio' || format === 'video';
}

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
  'audio-overview': { label: 'Audio overview', format: 'audio' },
  'video-overview': { label: 'Video', format: 'video' },
};

export const MemoryArtifactSchema = z.object({
  id: z.string(),
  memoryId: z.string(),
  kind: MemoryArtifactKindSchema,
  format: MemoryArtifactFormatSchema,
  title: z.string(),
  /** Markdown/SVG (text kinds) or the script/outline (file kinds); empty until generation completes. */
  content: z.string(),
  status: MemoryArtifactStatusSchema,
  /** Populated when `status === 'failed'`; a human-readable reason. */
  error: z.string().nullable(),
  /** Uploads-relative path to the rendered media file (file-backed kinds); null when none. */
  filePath: z.string().nullable(),
  /** MIME type of `filePath`, or null when there is no file. */
  mimeType: z.string().nullable(),
  /** Byte size of `filePath`, or null when there is no file. */
  fileSize: z.number().int().nonnegative().nullable(),
  /** True when the artifact completed `ready` without its media file (no TTS/ffmpeg provider). */
  degraded: z.boolean(),
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

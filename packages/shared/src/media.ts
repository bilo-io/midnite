import { z } from 'zod';

export const MEDIA_TYPES = ['image', 'video', 'audio'] as const;
export const MediaTypeSchema = z.enum(MEDIA_TYPES);
export type MediaType = z.infer<typeof MediaTypeSchema>;

/**
 * A media `filePath` must be a **relative path confined to the uploads dir**: no
 * absolute paths (posix `/…`, Windows `C:\…`, or backslash/UNC-rooted), no `..`
 * traversal segment, and no NUL byte. The file-serve endpoint (`GET /media/:id/file`)
 * streams this path from disk, so an unconstrained value is an arbitrary-file-read
 * vector (Phase 60 C). Empty string means "no file yet" and is allowed. This is the
 * write-time guard; the gateway also enforces containment again at serve time.
 */
export function isSafeMediaFilePath(p: string): boolean {
  if (p === '') return true;
  if (p.includes('\0')) return false;
  if (/^[a-zA-Z]:[\\/]/.test(p)) return false; // Windows drive-absolute
  if (p.startsWith('/') || p.startsWith('\\')) return false; // posix-absolute / UNC / backslash-rooted
  return !p.split(/[\\/]/).includes('..'); // no traversal segment
}

const MEDIA_FILE_PATH_MESSAGE =
  'filePath must be a relative path within the uploads dir (no absolute paths or "..")';

export const MediaSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  type: MediaTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  filePath: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
  prompt: z.string().optional(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Media = z.infer<typeof MediaSchema>;

export const CreateMediaBodySchema = z.object({
  type: MediaTypeSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional(),
  projectId: z.string().optional(),
  filePath: z.string().default('').refine(isSafeMediaFilePath, MEDIA_FILE_PATH_MESSAGE),
  mimeType: z.string().default('application/octet-stream'),
  fileSize: z.number().int().nonnegative().default(0),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
  prompt: z.string().max(8000).optional(),
  tags: z.array(z.string()).default([]),
});
export type CreateMediaBody = z.infer<typeof CreateMediaBodySchema>;

export const UpdateMediaBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
  projectId: z.string().optional().nullable(),
  filePath: z.string().refine(isSafeMediaFilePath, MEDIA_FILE_PATH_MESSAGE).optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  duration: z.number().positive().optional().nullable(),
  prompt: z.string().max(8000).optional(),
  tags: z.array(z.string()).optional(),
});
export type UpdateMediaBody = z.infer<typeof UpdateMediaBodySchema>;

export const MediaResponseSchema = z.object({ media: MediaSchema });
export const MediaListResponseSchema = z.object({ items: z.array(MediaSchema) });
export type MediaResponse = z.infer<typeof MediaResponseSchema>;
export type MediaListResponse = z.infer<typeof MediaListResponseSchema>;

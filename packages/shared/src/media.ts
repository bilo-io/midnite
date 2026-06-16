import { z } from 'zod';

export const MEDIA_TYPES = ['image', 'video', 'audio'] as const;
export const MediaTypeSchema = z.enum(MEDIA_TYPES);
export type MediaType = z.infer<typeof MediaTypeSchema>;

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
  filePath: z.string().default(''),
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
  filePath: z.string().optional(),
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

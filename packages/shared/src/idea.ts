import { z } from 'zod';

export const IdeaStatusSchema = z.enum(['draft', 'refined', 'promoted']);
export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;

export const IdeaMessageRoleSchema = z.enum(['user', 'assistant']);
export type IdeaMessageRole = z.infer<typeof IdeaMessageRoleSchema>;

export const IdeaSchema = z.object({
  id: z.string(),
  teamId: z.string().optional(),
  createdBy: z.string().optional(),
  title: z.string(),
  body: z.string(),
  status: IdeaStatusSchema,
  /** Set once the idea is promoted to a project. */
  projectId: z.string().nullable().optional(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const IdeaMessageSchema = z.object({
  id: z.string(),
  ideaId: z.string(),
  role: IdeaMessageRoleSchema,
  content: z.string(),
  createdAt: z.string(),
});
export type IdeaMessage = z.infer<typeof IdeaMessageSchema>;

export const CreateIdeaRequestSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(200),
  body: z.string().max(50_000).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
});
export type CreateIdeaRequest = z.infer<typeof CreateIdeaRequestSchema>;

export const UpdateIdeaRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().max(50_000).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  status: IdeaStatusSchema.optional(),
});
export type UpdateIdeaRequest = z.infer<typeof UpdateIdeaRequestSchema>;

export const IdeaChatRequestSchema = z.object({
  content: z.string().trim().min(1, 'message content is required').max(10_000),
});
export type IdeaChatRequest = z.infer<typeof IdeaChatRequestSchema>;

export const IdeaChatResponseSchema = z.object({
  userMessage: IdeaMessageSchema,
  assistantMessage: IdeaMessageSchema,
});
export type IdeaChatResponse = z.infer<typeof IdeaChatResponseSchema>;

export const IdeaResponseSchema = z.object({ idea: IdeaSchema });
export type IdeaResponse = z.infer<typeof IdeaResponseSchema>;

export const IdeasResponseSchema = z.object({
  ideas: z.array(IdeaSchema),
  total: z.number().int().nonnegative(),
});
export type IdeasResponse = z.infer<typeof IdeasResponseSchema>;

export const IdeaMessagesResponseSchema = z.object({
  messages: z.array(IdeaMessageSchema),
});
export type IdeaMessagesResponse = z.infer<typeof IdeaMessagesResponseSchema>;

/** Query params for GET /ideas. */
export const IdeaQuerySchema = z.object({
  status: IdeaStatusSchema.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type IdeaQuery = z.infer<typeof IdeaQuerySchema>;

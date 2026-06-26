import { z } from 'zod';
import { IdeaSchema } from '../idea.js';

export const IdeaEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('idea.created'), at: z.string(), idea: IdeaSchema }),
  z.object({ type: z.literal('idea.updated'), at: z.string(), idea: IdeaSchema }),
  z.object({ type: z.literal('idea.deleted'), at: z.string(), id: z.string() }),
]);
export type IdeaEvent = z.infer<typeof IdeaEventSchema>;

export const IDEAS_WS_PATH = '/ws/ideas';

export const IdeaSubscribeMessageSchema = z.object({ type: z.literal('subscribe') });
export type IdeaSubscribeMessage = z.infer<typeof IdeaSubscribeMessageSchema>;

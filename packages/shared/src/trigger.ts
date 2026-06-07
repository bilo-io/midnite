import { z } from 'zod';

export const TRIGGER_TYPES = ['manual', 'schedule', 'webhook'] as const;
export const TriggerTypeSchema = z.enum(TRIGGER_TYPES);

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export const HttpMethodSchema = z.enum(HTTP_METHODS);

// Run only when the Play button is pressed.
export const ManualTriggerSchema = z.object({
  type: z.literal('manual'),
});

// Run automatically on a cron schedule, evaluated by the gateway scheduler.
export const ScheduleTriggerSchema = z.object({
  type: z.literal('schedule'),
  cron: z.string().min(1),
  timezone: z.string().default('UTC'),
});

// Run when an inbound HTTP request hits the workflow's signed webhook URL.
// The secret token is write-only: never serialised on read, only `hasSecret` is exposed.
export const WebhookTriggerSchema = z.object({
  type: z.literal('webhook'),
  method: HttpMethodSchema.default('POST'),
  hasSecret: z.boolean().default(false),
});

export const TriggerSchema = z.discriminatedUnion('type', [
  ManualTriggerSchema,
  ScheduleTriggerSchema,
  WebhookTriggerSchema,
]);

export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type ManualTrigger = z.infer<typeof ManualTriggerSchema>;
export type ScheduleTrigger = z.infer<typeof ScheduleTriggerSchema>;
export type WebhookTrigger = z.infer<typeof WebhookTriggerSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;

import { z } from 'zod';

export const TRIGGER_TYPES = ['manual', 'webhook', 'task-event'] as const;
export const TriggerTypeSchema = z.enum(TRIGGER_TYPES);

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export const HttpMethodSchema = z.enum(HTTP_METHODS);

// The terminal / attention-worthy task transitions a task-event trigger can fire on.
export const TASK_EVENT_TRIGGER_EVENTS = [
  'task.done',
  'task.abandoned',
  'task.needs-attention',
] as const;
export const TaskEventTriggerEventSchema = z.enum(TASK_EVENT_TRIGGER_EVENTS);

// Run only when the Play button is pressed.
export const ManualTriggerSchema = z.object({
  type: z.literal('manual'),
});

// Run when an inbound HTTP request hits the workflow's signed webhook URL.
// The secret token is write-only: never serialised on read, only `hasSecret` is exposed.
export const WebhookTriggerSchema = z.object({
  type: z.literal('webhook'),
  method: HttpMethodSchema.default('POST'),
  hasSecret: z.boolean().default(false),
});

// Optional narrowing for a task-event trigger: fire only for tasks matching
// these fields. An omitted field matches any value.
export const TaskEventTriggerFilterSchema = z.object({
  repo: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  priority: z.number().int().min(0).max(3).optional(),
});

// Run automatically when a task reaches a terminal / attention-worthy state,
// evaluated by the gateway against the TaskEventBus. Requires at least one event.
export const TaskEventTriggerSchema = z.object({
  type: z.literal('task-event'),
  events: z.array(TaskEventTriggerEventSchema).min(1),
  filter: TaskEventTriggerFilterSchema.optional(),
});

export const TriggerSchema = z.discriminatedUnion('type', [
  ManualTriggerSchema,
  WebhookTriggerSchema,
  TaskEventTriggerSchema,
]);

export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type ManualTrigger = z.infer<typeof ManualTriggerSchema>;
export type WebhookTrigger = z.infer<typeof WebhookTriggerSchema>;
export type TaskEventTriggerEvent = z.infer<typeof TaskEventTriggerEventSchema>;
export type TaskEventTriggerFilter = z.infer<typeof TaskEventTriggerFilterSchema>;
export type TaskEventTrigger = z.infer<typeof TaskEventTriggerSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;

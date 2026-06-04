import { z } from 'zod';

export const STATUSES = [
  'backlog',
  'todo',
  'wip',
  'waiting',
  'done',
  'abandoned',
] as const;

export const TASK_KINDS = [
  'bug',
  'feature',
  'question',
  'chore',
  'unknown',
] as const;

export const StatusSchema = z.enum(STATUSES);
export const TaskKindSchema = z.enum(TASK_KINDS);

export const TaskEventSchema = z.object({
  at: z.string(),
  kind: z.string(),
  data: z.record(z.unknown()).optional(),
});

export const TaskAttachmentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  path: z.string(),
  mime: z.string(),
  size: z.number().int().nonnegative(),
  originalName: z.string().optional(),
  createdAt: z.string(),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: TaskKindSchema.optional(),
  repo: z.string().optional(),
  prompt: z.string().optional(),
  status: StatusSchema,
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
  prUrl: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  events: z.array(TaskEventSchema),
  attachments: z.array(TaskAttachmentSchema).optional(),
});

export const AgentSlotSchema = z.object({
  id: z.string(),
  status: z.enum(['idle', 'busy']),
  taskId: z.string().optional(),
  pid: z.number().int().optional(),
});

export const TaskCountsSchema = z.object({
  backlog: z.number().int().nonnegative(),
  todo: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
});

export const CreateTaskRequestSchema = z.object({
  prompt: z.string().min(1).max(8000),
  repo: z.string().optional(),
});

export const CreateTaskResponseSchema = z.object({
  task: TaskSchema,
});

export const ClassifiedTaskSchema = z.object({
  title: z.string().min(1).max(120),
  kind: TaskKindSchema,
});

export type Status = z.infer<typeof StatusSchema>;
export type TaskKind = z.infer<typeof TaskKindSchema>;
export type TaskEvent = z.infer<typeof TaskEventSchema>;
export type TaskAttachment = z.infer<typeof TaskAttachmentSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type AgentSlot = z.infer<typeof AgentSlotSchema>;
export type TaskCounts = z.infer<typeof TaskCountsSchema>;
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;
export type ClassifiedTask = z.infer<typeof ClassifiedTaskSchema>;

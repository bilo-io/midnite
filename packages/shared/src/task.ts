import { z } from 'zod';
import { SOURCE_KINDS } from './source.js';

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

export const TaskLinkSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  url: z.string().url(),
  kind: z.enum(SOURCE_KINDS),
  label: z.string().optional(),
  createdAt: z.string(),
});

export const AddTaskLinkRequestSchema = z.object({
  url: z.string().url(),
  label: z.string().max(200).optional(),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: TaskKindSchema.optional(),
  repo: z.string().optional(),
  prompt: z.string().optional(),
  status: StatusSchema,
  /** Scheduling priority: 0 Low · 1 Normal · 2 High · 3 Urgent. Higher runs first. */
  priority: z.number().int().min(0).max(3).default(1),
  /** How many times an agent run has been auto-retried after an unexpected exit. */
  retryCount: z.number().int().nonnegative().default(0),
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
  prUrl: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  /** ISO timestamp when the task (and thus its session) was archived; absent when active. */
  archivedAt: z.string().optional(),
  events: z.array(TaskEventSchema),
  attachments: z.array(TaskAttachmentSchema).optional(),
  links: z.array(TaskLinkSchema).optional(),
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
  projectId: z.string().optional(),
  priority: z.number().int().min(0).max(3).optional(),
});

// Reassign (or clear, via null) a task's project.
export const UpdateTaskProjectRequestSchema = z.object({
  projectId: z.string().nullable(),
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
export type TaskLink = z.infer<typeof TaskLinkSchema>;
export type AddTaskLinkRequest = z.infer<typeof AddTaskLinkRequestSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type AgentSlot = z.infer<typeof AgentSlotSchema>;
export type TaskCounts = z.infer<typeof TaskCountsSchema>;
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type UpdateTaskProjectRequest = z.infer<typeof UpdateTaskProjectRequestSchema>;
export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;
export type ClassifiedTask = z.infer<typeof ClassifiedTaskSchema>;

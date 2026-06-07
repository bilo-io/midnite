import { z } from 'zod';

export const RUN_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'canceled'] as const;
export const RunStatusSchema = z.enum(RUN_STATUSES);

export const NODE_RUN_STATUSES = ['pending', 'running', 'succeeded', 'failed', 'skipped'] as const;
export const NodeRunStatusSchema = z.enum(NODE_RUN_STATUSES);

export const RUN_TRIGGER_SOURCES = ['manual', 'schedule', 'webhook'] as const;
export const RunTriggerSourceSchema = z.enum(RUN_TRIGGER_SOURCES);

export const NodeRunLogSchema = z.object({
  at: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
});

export const NodeRunSchema = z.object({
  id: z.string(),
  runId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: NodeRunStatusSchema,
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  logs: z.array(NodeRunLogSchema).default([]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
});

export const WorkflowRunSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: RunStatusSchema,
  triggerSource: RunTriggerSourceSchema,
  input: z.unknown().optional(),
  error: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  nodeRuns: z.array(NodeRunSchema).default([]),
});

export const RunWorkflowRequestSchema = z.object({
  input: z.record(z.unknown()).optional(),
});

export const RunResponseSchema = z.object({ run: WorkflowRunSchema });

export type RunStatus = z.infer<typeof RunStatusSchema>;
export type NodeRunStatus = z.infer<typeof NodeRunStatusSchema>;
export type RunTriggerSource = z.infer<typeof RunTriggerSourceSchema>;
export type NodeRunLog = z.infer<typeof NodeRunLogSchema>;
export type NodeRun = z.infer<typeof NodeRunSchema>;
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
export type RunWorkflowRequest = z.infer<typeof RunWorkflowRequestSchema>;
export type RunResponse = z.infer<typeof RunResponseSchema>;

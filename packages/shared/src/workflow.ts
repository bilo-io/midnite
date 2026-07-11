import { z } from 'zod';
import { WorkflowNodeSchema, WorkflowEdgeSchema } from './node.js';
import { TriggerSchema, TriggerTypeSchema } from './trigger.js';
import { RunStatusSchema } from './run.js';
import { pagedSchema } from './task.js';

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().max(8000).optional(),
  enabled: z.boolean().default(false),
  trigger: TriggerSchema,
  nodes: z.array(WorkflowNodeSchema).default([]),
  edges: z.array(WorkflowEdgeSchema).default([]),
  archived: z.boolean().optional(),
  /** Phase 36: the template this was installed from, if any. */
  installedFromTemplateId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  teamId: z.string().optional(),
});

// Trimmed shape for list views — no graph payload.
export const WorkflowSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean(),
  triggerType: TriggerTypeSchema,
  // Present for schedule triggers — lets list views sort by cadence and show the cron.
  cron: z.string().optional(),
  // Present for schedule triggers — needed to compute correct "next run" times client-side.
  timezone: z.string().optional(),
  nodeCount: z.number().int().nonnegative(),
  // Lightweight ordered node breakdown for list views (type id + optional label),
  // so cards can show a step summary without hydrating the full graph.
  steps: z.array(z.object({ type: z.string(), label: z.string().optional() })).default([]),
  lastRunAt: z.string().optional(),
  lastRunStatus: RunStatusSchema.optional(),
  archived: z.boolean().optional(),
  installedFromTemplateId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  teamId: z.string().optional(),
});

export const CreateWorkflowRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(8000).optional(),
  trigger: TriggerSchema.optional(),
});

export const UpdateWorkflowRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(8000).optional(),
  enabled: z.boolean().optional(),
  trigger: TriggerSchema.optional(),
  nodes: z.array(WorkflowNodeSchema).optional(),
  edges: z.array(WorkflowEdgeSchema).optional(),
  archived: z.boolean().optional(),
});

export const WorkflowResponseSchema = z.object({ workflow: WorkflowSchema });

// Returned once when a webhook trigger's secret token is (re)generated.
export const WebhookInfoResponseSchema = z.object({
  url: z.string(),
  token: z.string(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowSummary = z.infer<typeof WorkflowSummarySchema>;

/** A page of workflow summaries (Phase 57 C follow-up): `{ items, total }`. */
export const WorkflowsPageSchema = pagedSchema(WorkflowSummarySchema);
export type WorkflowsPage = z.infer<typeof WorkflowsPageSchema>;
export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowRequestSchema>;
export type UpdateWorkflowRequest = z.infer<typeof UpdateWorkflowRequestSchema>;
export type WorkflowResponse = z.infer<typeof WorkflowResponseSchema>;
export type WebhookInfoResponse = z.infer<typeof WebhookInfoResponseSchema>;

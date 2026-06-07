import { z } from 'zod';
import { WorkflowRunSchema } from '../run.js';

// Live workflow-run events published over the gateway WebSocket. Defined now so the
// realtime-streaming phase is a drop-in; the MVP polls run state instead of emitting these.
export const WorkflowEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('run.started'),
    workflowId: z.string(),
    runId: z.string(),
    at: z.string(),
    triggerSource: z.string(),
  }),
  z.object({
    type: z.literal('node.started'),
    workflowId: z.string(),
    runId: z.string(),
    at: z.string(),
    nodeId: z.string(),
    nodeType: z.string(),
  }),
  z.object({
    type: z.literal('node.succeeded'),
    workflowId: z.string(),
    runId: z.string(),
    at: z.string(),
    nodeId: z.string(),
    output: z.unknown().optional(),
  }),
  z.object({
    type: z.literal('node.failed'),
    workflowId: z.string(),
    runId: z.string(),
    at: z.string(),
    nodeId: z.string(),
    error: z.string(),
  }),
  z.object({
    type: z.literal('run.finished'),
    workflowId: z.string(),
    runId: z.string(),
    at: z.string(),
    run: WorkflowRunSchema,
  }),
  z.object({
    type: z.literal('run.failed'),
    workflowId: z.string(),
    runId: z.string(),
    at: z.string(),
    error: z.string(),
  }),
]);

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;

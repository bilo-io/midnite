import { z } from 'zod';
import { WorkflowRunSchema } from '../run.js';
import { sequencedEnvelope, SubscribeOrResumeSchema, type SequencedEnvelope } from './envelope.js';

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

// Phase 56 A — sequenced wire shape on `/ws/workflows` (ring is per runId).
export const SequencedWorkflowEventSchema = sequencedEnvelope(WorkflowEventSchema);
export type SequencedWorkflowEvent = SequencedEnvelope<WorkflowEvent>;

// Client → gateway message on the workflow WS: subscribe to a run's live events.
// Phase 56 B: `subscribe` (fresh) or `resume` (reconnect + cursor); `runId` names
// the run whose ring to anchor/replay.
export const WorkflowSubscribeMessageSchema = SubscribeOrResumeSchema.extend({ runId: z.string() });
export type WorkflowSubscribeMessage = z.infer<typeof WorkflowSubscribeMessageSchema>;

export const WORKFLOW_WS_PATH = '/ws/workflows';

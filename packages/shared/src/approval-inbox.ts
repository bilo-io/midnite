import { z } from 'zod';

import { ApprovalDecisionSchema, ApprovalResolutionSchema } from './events/terminal.js';

// ---- WS path ----

export const APPROVALS_WS_PATH = '/ws/approvals';

// ---- Autonomy mode ----

export const AutonomyModeSchema = z.enum(['manual', 'guarded', 'autonomous']);
export type AutonomyMode = z.infer<typeof AutonomyModeSchema>;

export const ModeResponseSchema = z.object({ mode: AutonomyModeSchema });
export type ModeResponse = z.infer<typeof ModeResponseSchema>;

export const SetModeRequestSchema = z.object({ mode: AutonomyModeSchema });
export type SetModeRequest = z.infer<typeof SetModeRequestSchema>;

// ---- Pending approval (live inbox) ----

export const PendingApprovalSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  taskId: z.string().nullable(),
  toolName: z.string(),
  summary: z.string(),
  cwd: z.string(),
  requestedAt: z.string(),
  deadlineAt: z.string().nullable(),
});
export type PendingApproval = z.infer<typeof PendingApprovalSchema>;

export const PendingApprovalsResponseSchema = z.object({
  pending: z.array(PendingApprovalSchema),
});
export type PendingApprovalsResponse = z.infer<typeof PendingApprovalsResponseSchema>;

// ---- Approval log (audit trail) ----

export const ApprovalDecidedBySchema = z.enum(['user', 'policy', 'timeout', 'system']);
export type ApprovalDecidedBy = z.infer<typeof ApprovalDecidedBySchema>;

export const ApprovalLogEntrySchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  taskId: z.string().nullable(),
  toolName: z.string(),
  summary: z.string(),
  resolution: ApprovalResolutionSchema,
  ruleId: z.string().nullable(),
  decidedBy: ApprovalDecidedBySchema,
  createdAt: z.string(),
});
export type ApprovalLogEntry = z.infer<typeof ApprovalLogEntrySchema>;

export const ApprovalLogResponseSchema = z.object({
  entries: z.array(ApprovalLogEntrySchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type ApprovalLogResponse = z.infer<typeof ApprovalLogResponseSchema>;

// ---- WS events ----

export const ApprovalRequestedEventSchema = z.object({
  type: z.literal('approval.requested'),
  approval: PendingApprovalSchema,
});
export type ApprovalRequestedEvent = z.infer<typeof ApprovalRequestedEventSchema>;

export const ApprovalResolvedEventSchema = z.object({
  type: z.literal('approval.resolved'),
  id: z.string(),
  resolution: ApprovalResolutionSchema,
});
export type ApprovalResolvedEvent = z.infer<typeof ApprovalResolvedEventSchema>;

export const ApprovalsWsEventSchema = z.discriminatedUnion('type', [
  ApprovalRequestedEventSchema,
  ApprovalResolvedEventSchema,
]);
export type ApprovalsWsEvent = z.infer<typeof ApprovalsWsEventSchema>;

// ---- WS client → server (resolve from inbox) ----

export const InboxResolveMessageSchema = z.object({
  type: z.literal('inbox.resolve'),
  requestId: z.string(),
  sessionId: z.string(),
  decision: ApprovalDecisionSchema,
});
export type InboxResolveMessage = z.infer<typeof InboxResolveMessageSchema>;

import { z } from 'zod';

export const AuditEntityTypeSchema = z.enum([
  'task',
  'repo',
  'project',
  'workflow',
  'user',
  'team',
  'deck',
  'guardrail',
  'approval_rule',
]);

export const AuditActionSchema = z.enum([
  'task.created',
  'task.status_changed',
  'task.deleted',
  'user.registered',
  'user.login',
  'user.logout',
  'team.created',
  'team.member_added',
  'team.member_removed',
  'team.member_role_changed',
  'workflow.run_started',
  'workflow.run_completed',
  'deck.created',
  'deck.updated',
  'deck.deleted',
  'guardrail.paused',
  'guardrail.resumed',
  'guardrail.emergency_stopped',
  // Phase 50 Theme D — close the audit gaps around the safety surface + blast radius.
  'guardrail.mode_changed',
  'approval_rule.created',
  'approval_rule.updated',
  'approval_rule.deleted',
  // Act-path decisions mirrored from approval_log so "what did agents do + what did
  // we allow/deny" is one query. entityId = sessionId; payload carries the resolution.
  'approval.decided',
  // Repo + project mutations (previously unaudited).
  'repo.created',
  'repo.updated',
  'repo.deleted',
  'project.created',
  'project.updated',
  'project.deleted',
]);

export const AuditEntrySchema = z.object({
  id: z.string(),
  entityType: AuditEntityTypeSchema,
  entityId: z.string(),
  /** null for system actions */
  userId: z.string().nullable(),
  action: AuditActionSchema,
  /** Optional JSON payload — e.g. { from: 'todo', to: 'wip' } for status changes. */
  payload: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});

export const AuditListResponseSchema = z.object({
  entries: z.array(AuditEntrySchema),
  total: z.number().int().nonnegative(),
});

export type AuditEntityType = z.infer<typeof AuditEntityTypeSchema>;
export type AuditAction = z.infer<typeof AuditActionSchema>;
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
export type AuditListResponse = z.infer<typeof AuditListResponseSchema>;

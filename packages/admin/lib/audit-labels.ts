import type { AuditAction, AuditEntityType } from '@midnite/shared';

/**
 * Human-readable labels for audit actions + entity types (Phase 73 Theme F).
 * Kept as a data map so the Overview activity strip and the Audit table render
 * the same wording. A missing key falls back to the raw id (never blank).
 */
export const AUDIT_ACTION_LABEL: Partial<Record<AuditAction, string>> = {
  'task.created': 'created a task',
  'task.status_changed': 'moved a task',
  'task.reopened': 'reopened a task',
  'task.deleted': 'deleted a task',
  'task.pr_reviewed': 'reviewed a PR',
  'task.pr_merged': 'merged a PR',
  'user.registered': 'registered',
  'user.login': 'signed in',
  'user.logout': 'signed out',
  'user.sso_linked': 'linked an SSO identity',
  'team.created': 'created a team',
  'team.member_added': 'added a member',
  'team.member_removed': 'removed a member',
  'team.member_role_changed': 'changed a member role',
  'workflow.run_started': 'started a workflow run',
  'workflow.run_completed': 'completed a workflow run',
  'milestone.created': 'created a milestone',
  'milestone.updated': 'updated a milestone',
  'milestone.deleted': 'deleted a milestone',
  'guardrail.paused': 'paused the fleet',
  'guardrail.resumed': 'resumed the fleet',
  'guardrail.emergency_stopped': 'emergency-stopped the fleet',
  'guardrail.mode_changed': 'changed guardrail mode',
  'approval_rule.created': 'created an approval rule',
  'approval_rule.updated': 'updated an approval rule',
  'approval_rule.deleted': 'deleted an approval rule',
  'approval.decided': 'decided an approval',
  'repo.created': 'created a repo',
  'repo.updated': 'updated a repo',
  'repo.deleted': 'deleted a repo',
  'project.created': 'created a project',
  'project.updated': 'updated a project',
  'project.deleted': 'deleted a project',
  'chat.command': 'ran a chat command',
  'chat.undo': 'undid a chat command',
};

export function auditActionLabel(action: AuditAction): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

export const AUDIT_ENTITY_LABEL: Record<AuditEntityType, string> = {
  task: 'Task',
  repo: 'Repo',
  project: 'Project',
  workflow: 'Workflow',
  user: 'User',
  team: 'Team',
  milestone: 'Milestone',
  guardrail: 'Guardrail',
  approval_rule: 'Approval rule',
};

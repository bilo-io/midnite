import { describe, expect, it } from 'vitest';
import { AuditActionSchema, AuditEntityTypeSchema } from './audit.js';

describe('audit taxonomy (Phase 50 D additions)', () => {
  it('accepts the new safety-surface + blast-radius actions', () => {
    for (const action of [
      'guardrail.mode_changed',
      'approval_rule.created',
      'approval_rule.updated',
      'approval_rule.deleted',
      'approval.decided',
      'repo.created',
      'repo.updated',
      'repo.deleted',
      'project.created',
      'project.updated',
      'project.deleted',
      'user.sso_linked',
    ]) {
      expect(AuditActionSchema.parse(action)).toBe(action);
    }
  });

  it('accepts the new entity types', () => {
    expect(AuditEntityTypeSchema.parse('approval_rule')).toBe('approval_rule');
    expect(AuditEntityTypeSchema.parse('project')).toBe('project');
  });

  it('still rejects an unknown action', () => {
    expect(() => AuditActionSchema.parse('nope.invalid')).toThrow();
  });
});

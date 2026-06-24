import { describe, expect, it } from 'vitest';
import {
  ApprovalRuleSchema,
  CreateApprovalRuleSchema,
  UpdateApprovalRuleSchema,
} from './approval-rule';

describe('ApprovalRuleSchema', () => {
  const base = {
    id: 'r1',
    enabled: true,
    effect: 'allow' as const,
    toolName: 'Read',
    scope: 'global' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('parses a minimal rule', () => {
    expect(ApprovalRuleSchema.safeParse(base).success).toBe(true);
  });

  it('parses a rule with match conditions', () => {
    const r = ApprovalRuleSchema.safeParse({
      ...base,
      match: {
        commandPrefix: ['git status', 'pnpm test'],
        pathGlob: ['src/**/*.ts'],
      },
      note: 'always allow reading source files',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.match?.commandPrefix).toHaveLength(2);
    }
  });

  it('allows toolName "*" for wildcard', () => {
    expect(ApprovalRuleSchema.safeParse({ ...base, toolName: '*' }).success).toBe(true);
  });

  it('rejects unknown effect values', () => {
    expect(ApprovalRuleSchema.safeParse({ ...base, effect: 'escalate' }).success).toBe(false);
  });

  it('scope must be "global"', () => {
    expect(ApprovalRuleSchema.safeParse({ ...base, scope: 'repo' }).success).toBe(false);
  });
});

describe('CreateApprovalRuleSchema', () => {
  it('omits id, createdAt, updatedAt', () => {
    const r = CreateApprovalRuleSchema.safeParse({
      enabled: true,
      effect: 'deny',
      toolName: 'Bash',
      scope: 'global',
    });
    expect(r.success).toBe(true);
  });
});

describe('UpdateApprovalRuleSchema', () => {
  it('all fields optional', () => {
    expect(UpdateApprovalRuleSchema.safeParse({}).success).toBe(true);
    expect(UpdateApprovalRuleSchema.safeParse({ enabled: false }).success).toBe(true);
  });
});

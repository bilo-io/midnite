import { describe, expect, it } from 'vitest';
import type { ApprovalRuleRow } from '../../db/schema';
import { evaluateRules } from './rule-evaluator';

function rule(overrides: Partial<ApprovalRuleRow> = {}): ApprovalRuleRow {
  return {
    id: 'r1',
    enabled: true,
    effect: 'allow',
    toolName: 'Read',
    match: null,
    scope: 'global',
    note: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('evaluateRules', () => {
  it('returns escalate when rules list is empty', () => {
    expect(evaluateRules([], 'Read', {})).toBe('escalate');
  });

  it('auto-allows an unconditional allow rule', () => {
    expect(evaluateRules([rule()], 'Read', {})).toBe('auto-allow');
  });

  it('auto-denies an unconditional deny rule', () => {
    expect(evaluateRules([rule({ effect: 'deny' })], 'Read', {})).toBe('auto-deny');
  });

  it('skips rules for other tools', () => {
    expect(evaluateRules([rule({ toolName: 'Write' })], 'Read', {})).toBe('escalate');
  });

  it('wildcard toolName matches any tool', () => {
    expect(evaluateRules([rule({ toolName: '*' })], 'Bash', {})).toBe('auto-allow');
  });

  it('first match wins — allow before deny', () => {
    const rules = [
      rule({ id: 'r1', toolName: 'Read', effect: 'allow' }),
      rule({ id: 'r2', toolName: 'Read', effect: 'deny' }),
    ];
    expect(evaluateRules(rules, 'Read', {})).toBe('auto-allow');
  });

  describe('commandPrefix match', () => {
    it('allows when command starts with a listed prefix', () => {
      const r = rule({
        toolName: 'Bash',
        match: JSON.stringify({ commandPrefix: ['git status', 'pnpm test'] }),
      });
      expect(evaluateRules([r], 'Bash', { command: 'git status --short' })).toBe('auto-allow');
      expect(evaluateRules([r], 'Bash', { command: 'pnpm test --run' })).toBe('auto-allow');
    });

    it('escalates when command does not match any prefix', () => {
      const r = rule({
        toolName: 'Bash',
        match: JSON.stringify({ commandPrefix: ['git status'] }),
      });
      expect(evaluateRules([r], 'Bash', { command: 'rm -rf /' })).toBe('escalate');
    });

    it('escalates when no command string in input', () => {
      const r = rule({
        toolName: 'Bash',
        match: JSON.stringify({ commandPrefix: ['git'] }),
      });
      expect(evaluateRules([r], 'Bash', {})).toBe('escalate');
    });
  });

  describe('pathGlob match', () => {
    it('allows when file_path matches a glob', () => {
      const r = rule({
        toolName: 'Read',
        match: JSON.stringify({ pathGlob: ['src/**/*.ts'] }),
      });
      expect(evaluateRules([r], 'Read', { file_path: 'src/foo/bar.ts' })).toBe('auto-allow');
    });

    it('escalates when file_path does not match', () => {
      const r = rule({
        toolName: 'Write',
        match: JSON.stringify({ pathGlob: ['src/**'] }),
      });
      expect(evaluateRules([r], 'Write', { file_path: '/etc/passwd' })).toBe('escalate');
    });

    it('* does not cross directory separators', () => {
      const r = rule({
        toolName: 'Read',
        match: JSON.stringify({ pathGlob: ['src/*.ts'] }),
      });
      expect(evaluateRules([r], 'Read', { file_path: 'src/a/b.ts' })).toBe('escalate');
      expect(evaluateRules([r], 'Read', { file_path: 'src/b.ts' })).toBe('auto-allow');
    });

    it('escalates when no file_path in input', () => {
      const r = rule({
        toolName: 'Read',
        match: JSON.stringify({ pathGlob: ['src/**'] }),
      });
      expect(evaluateRules([r], 'Read', {})).toBe('escalate');
    });
  });
});

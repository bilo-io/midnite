import { describe, expect, it } from 'vitest';
import { EmergencyStopRequestSchema, GuardrailSettingsSchema, isTaskPaused, PauseScopeSchema } from './guardrails.js';

const base = {
  pausedGlobal: false,
  pausedRepos: [] as string[],
  pausedTeams: [] as string[],
  pausedBy: null,
  pausedAt: null,
};

describe('isTaskPaused', () => {
  it('is false when nothing is paused', () => {
    expect(isTaskPaused(base, { repo: 'acme/api', teamId: 't1' })).toBe(false);
  });

  it('global pause halts every task', () => {
    const g = { ...base, pausedGlobal: true };
    expect(isTaskPaused(g, { repo: 'x' })).toBe(true);
    expect(isTaskPaused(g, {})).toBe(true);
  });

  it('repo pause halts only that repo', () => {
    const g = { ...base, pausedRepos: ['acme/api'] };
    expect(isTaskPaused(g, { repo: 'acme/api' })).toBe(true);
    expect(isTaskPaused(g, { repo: 'acme/web' })).toBe(false);
  });

  it('team pause halts only that team', () => {
    const g = { ...base, pausedTeams: ['team-7'] };
    expect(isTaskPaused(g, { teamId: 'team-7' })).toBe(true);
    expect(isTaskPaused(g, { teamId: 'team-8' })).toBe(false);
  });
});

describe('guardrail schemas', () => {
  it('EmergencyStopRequest defaults scope to global', () => {
    expect(EmergencyStopRequestSchema.parse({})).toEqual({ scope: { kind: 'global' } });
  });

  it('PauseScope rejects a repo scope without an id', () => {
    expect(PauseScopeSchema.safeParse({ kind: 'repo' }).success).toBe(false);
    expect(PauseScopeSchema.safeParse({ kind: 'repo', id: 'x' }).success).toBe(true);
  });

  it('GuardrailSettings round-trips', () => {
    const parsed = GuardrailSettingsSchema.parse(base);
    expect(parsed.pausedGlobal).toBe(false);
  });
});

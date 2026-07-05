import { describe, expect, it } from 'vitest';
import type { ApprovalLogEntry, GuardrailCaps, GuardrailSettings } from '@midnite/shared';

import {
  capsRows,
  denialRows,
  parsePauseScope,
  pauseStateLine,
  recentDenials,
  scopeLabel,
} from './guardrails.js';

const settings = (over: Partial<GuardrailSettings> = {}): GuardrailSettings => ({
  pausedGlobal: false,
  pausedRepos: [],
  pausedTeams: [],
  pausedBy: null,
  pausedAt: null,
  ...over,
});

const entry = (over: Partial<ApprovalLogEntry>): ApprovalLogEntry => ({
  id: 'l1',
  sessionId: 'sess-abcdef12',
  taskId: null,
  toolName: 'Bash',
  summary: null,
  resolution: 'auto-deny',
  ruleId: null,
  decidedBy: 'policy',
  createdAt: '2026-07-03T10:00:00.000Z',
  ...over,
});

describe('parsePauseScope', () => {
  it('defaults to global with no flags', () => {
    expect(parsePauseScope({})).toEqual({ kind: 'global' });
  });
  it('maps --repo / --team to a scoped union (trimmed)', () => {
    expect(parsePauseScope({ repo: ' acme/api ' })).toEqual({ kind: 'repo', id: 'acme/api' });
    expect(parsePauseScope({ team: 't-7' })).toEqual({ kind: 'team', id: 't-7' });
  });
  it('rejects passing both --repo and --team', () => {
    expect(() => parsePauseScope({ repo: 'a', team: 'b' })).toThrow(/at most one/);
  });
});

describe('scopeLabel', () => {
  it('reads naturally per scope', () => {
    expect(scopeLabel({ kind: 'global' })).toBe('globally');
    expect(scopeLabel({ kind: 'repo', id: 'acme/api' })).toBe('repo acme/api');
    expect(scopeLabel({ kind: 'team', id: 't-7' })).toBe('team t-7');
  });
});

describe('pauseStateLine', () => {
  it('reports active when nothing is paused', () => {
    expect(pauseStateLine(settings())).toMatch(/active/);
  });
  it('reports a global pause', () => {
    expect(pauseStateLine(settings({ pausedGlobal: true }))).toMatch(/PAUSED globally/);
  });
  it('lists scoped pauses', () => {
    const line = pauseStateLine(settings({ pausedRepos: ['acme/api'], pausedTeams: ['t-7'] }));
    expect(line).toContain('repo acme/api');
    expect(line).toContain('team t-7');
  });
});

describe('capsRows', () => {
  const caps: GuardrailCaps = {
    mode: 'guarded',
    hardDailyCapUsd: 25,
    hardMonthlyCapUsd: null,
    softDailyBudgetUsd: null,
    softMonthlyBudgetUsd: 500,
    maxSpawnsPerHour: 10,
    blastRadiusEnabled: true,
    protectedBranches: ['main', 'master'],
    protectedPathGlobs: ['**/.env'],
    scrubSpawnEnv: false,
  };
  it('renders set/unset caps and the mode + rate', () => {
    const flat = capsRows(caps).map((r) => r.join(' '));
    expect(flat).toContainEqual(expect.stringContaining('Policy mode guarded'));
    expect(flat).toContainEqual(expect.stringContaining('Hard daily cap $25'));
    expect(flat).toContainEqual(expect.stringContaining('Hard monthly cap unset'));
    expect(flat).toContainEqual(expect.stringContaining('Max spawns / hour 10/hr'));
  });
  it('shows "unlimited" when the rate cap is 0', () => {
    const flat = capsRows({ ...caps, maxSpawnsPerHour: 0 }).map((r) => r.join(' '));
    expect(flat).toContainEqual(expect.stringContaining('unlimited'));
  });
});

describe('recentDenials', () => {
  it('keeps only deny/auto-deny, newest-first, capped', () => {
    const entries: ApprovalLogEntry[] = [
      entry({ id: '1', resolution: 'auto-deny' }),
      entry({ id: '2', resolution: 'auto-allow' }),
      entry({ id: '3', resolution: 'deny' }),
      entry({ id: '4', resolution: 'ask' }),
    ];
    const out = recentDenials(entries, 10);
    expect(out.map((e) => e.id)).toEqual(['1', '3']);
  });
  it('respects the limit', () => {
    const entries = Array.from({ length: 15 }, (_, i) => entry({ id: `d${i}`, resolution: 'deny' }));
    expect(recentDenials(entries, 10)).toHaveLength(10);
  });
});

describe('denialRows', () => {
  it('projects a row with a short session id', () => {
    const [row] = denialRows([entry({ sessionId: 'sess-abcdef12ghij' })]);
    expect(row).toBeDefined();
    expect(row![1]).toBe('Bash');
    expect(row![4]).toBe('sess-abc'); // first 8 chars
  });
});

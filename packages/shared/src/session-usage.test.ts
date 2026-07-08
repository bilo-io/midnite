import { describe, expect, it } from 'vitest';

import { SessionUsageSchema } from './session-usage.js';

const base = {
  sessionId: 't1',
  agentCli: 'claude',
  model: 'claude-sonnet-4-6',
  inputTokens: 100,
  outputTokens: 50,
  cachedReadTokens: 10,
  cachedWriteTokens: 5,
  contextTokens: 40_000,
  estCostUsd: 0.01,
  measured: true,
  updatedAt: '2026-07-08T00:00:00.000Z',
};

describe('SessionUsageSchema', () => {
  it('round-trips a full row', () => {
    expect(SessionUsageSchema.parse(base)).toEqual(base);
  });

  it('accepts a null estCostUsd (unpriced model)', () => {
    expect(SessionUsageSchema.parse({ ...base, estCostUsd: null }).estCostUsd).toBeNull();
  });

  it('allows optional agentCli/model to be absent', () => {
    const { agentCli: _a, model: _m, ...rest } = base;
    const parsed = SessionUsageSchema.parse(rest);
    expect(parsed.agentCli).toBeUndefined();
    expect(parsed.model).toBeUndefined();
  });

  it('rejects negative token counts', () => {
    expect(SessionUsageSchema.safeParse({ ...base, inputTokens: -1 }).success).toBe(false);
    expect(SessionUsageSchema.safeParse({ ...base, contextTokens: -1 }).success).toBe(false);
  });
});

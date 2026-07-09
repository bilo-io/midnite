import { describe, expect, it } from 'vitest';
import {
  LLM_FEATURES,
  LlmFeatureSchema,
  UsageAttributionQuerySchema,
  UsageAttributionResponseSchema,
  UsageConfigSchema,
  UsageRecordSchema,
  UsageSummaryQuerySchema,
  UsageSummaryResponseSchema,
} from './usage.js';

describe('LlmFeatureSchema', () => {
  it('accepts every declared feature and rejects others', () => {
    for (const f of LLM_FEATURES) expect(LlmFeatureSchema.parse(f)).toBe(f);
    expect(LlmFeatureSchema.safeParse('embedding').success).toBe(false);
  });
});

describe('UsageRecordSchema', () => {
  const base = {
    id: 'u1',
    at: '2026-06-20T00:00:00.000Z',
    provider: 'anthropic' as const,
    model: 'opus',
    feature: 'classifier' as const,
    inputTokens: 100,
    outputTokens: 50,
    estCostUsd: 0.01,
  };

  it('round-trips a record and allows a null correlationId', () => {
    expect(UsageRecordSchema.parse({ ...base, correlationId: null }).correlationId).toBeNull();
  });

  it('rejects negative token counts', () => {
    expect(UsageRecordSchema.safeParse({ ...base, inputTokens: -1 }).success).toBe(false);
  });
});

describe('UsageSummaryQuerySchema', () => {
  it('defaults groupBy to day', () => {
    expect(UsageSummaryQuerySchema.parse({}).groupBy).toBe('day');
  });

  it('rejects an unknown groupBy', () => {
    expect(UsageSummaryQuerySchema.safeParse({ groupBy: 'model' }).success).toBe(false);
  });
});

describe('UsageConfigSchema', () => {
  it('defaults warnAtRatio to 0.8', () => {
    expect(UsageConfigSchema.parse({}).warnAtRatio).toBe(0.8);
  });

  it('rejects a non-positive daily budget and a ratio above 1', () => {
    expect(UsageConfigSchema.safeParse({ dailyBudgetUsd: 0 }).success).toBe(false);
    expect(UsageConfigSchema.safeParse({ warnAtRatio: 1.5 }).success).toBe(false);
  });
});

describe('UsageSummaryResponseSchema', () => {
  it('round-trips a summary with all axes', () => {
    const totals = { calls: 1, inputTokens: 10, outputTokens: 5, estCostUsd: 0.001 };
    const res = {
      from: null,
      to: null,
      groupBy: 'day' as const,
      totals,
      buckets: [{ key: '2026-06-20', ...totals }],
      byProvider: [],
      byFeature: [],
      byDay: [],
      warnings: [],
      costIsEstimate: true,
      composition: {
        llmUsd: 0.001,
        sessionMeasuredUsd: 0,
        sessionEstimatedUsd: 0,
        unpricedSessions: 0,
      },
    };
    expect(UsageSummaryResponseSchema.parse(res)).toEqual(res);
  });
});

describe('UsageAttributionQuerySchema', () => {
  it('defaults groupBy to repo', () => {
    expect(UsageAttributionQuerySchema.parse({}).groupBy).toBe('repo');
  });

  it('accepts the four attribution dimensions and rejects others', () => {
    for (const g of ['task', 'repo', 'project', 'session']) {
      expect(UsageAttributionQuerySchema.parse({ groupBy: g }).groupBy).toBe(g);
    }
    expect(UsageAttributionQuerySchema.safeParse({ groupBy: 'day' }).success).toBe(false);
  });
});

describe('UsageAttributionResponseSchema', () => {
  it('round-trips an attribution response with a measured/estimated split', () => {
    const bucket = {
      key: 'midnite',
      label: 'midnite',
      sessions: 2,
      inputTokens: 100,
      outputTokens: 40,
      cachedTokens: 10,
      estCostUsd: 0.05,
      measuredCostUsd: 0.05,
      estimatedCostUsd: 0,
      unpricedSessions: 1,
    };
    const res = {
      from: null,
      to: null,
      groupBy: 'repo' as const,
      totals: {
        sessions: 2,
        inputTokens: 100,
        outputTokens: 40,
        cachedTokens: 10,
        estCostUsd: 0.05,
        measuredCostUsd: 0.05,
        estimatedCostUsd: 0,
        unpricedSessions: 1,
      },
      buckets: [bucket],
    };
    expect(UsageAttributionResponseSchema.parse(res)).toEqual(res);
  });
});

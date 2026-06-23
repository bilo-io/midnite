import { describe, expect, it } from 'vitest';
import { MetricsGaugesSchema, OpsSummarySchema, OpsQuerySchema } from './metrics';

describe('MetricsGaugesSchema', () => {
  it('parses a full gauges snapshot', () => {
    const result = MetricsGaugesSchema.parse({ queueDepth: 3, slots: { used: 2, total: 4 }, lastTickLatencyMs: 12.5, updatedAt: '2026-06-23T12:00:00Z' });
    expect(result.queueDepth).toBe(3);
  });
  it('parses null values', () => {
    const result = MetricsGaugesSchema.parse({ queueDepth: null, slots: null, lastTickLatencyMs: null, updatedAt: null });
    expect(result.queueDepth).toBeNull();
  });
});

describe('OpsSummarySchema', () => {
  it('round-trips a complete ops summary', () => {
    const input = { gauges: { queueDepth: 0, slots: { used: 0, total: 2 }, lastTickLatencyMs: 5, updatedAt: '2026-06-23T12:00:00Z' }, throughput: [{ day: '2026-06-23', count: 3 }], durations: { under30s: 1, under2m: 1, under10m: 1, under30m: 0, over30m: 0 }, outcomes: { done: 3, abandoned: 0, failed: 0, cancelled: 0 }, window: { from: '2026-05-24', to: '2026-06-23' } };
    const result = OpsSummarySchema.parse(input);
    expect(result.throughput[0]?.count).toBe(3);
  });
});

describe('OpsQuerySchema', () => {
  it('accepts empty query', () => { expect(OpsQuerySchema.parse({})).toEqual({}); });
  it('accepts from+to', () => { const q = OpsQuerySchema.parse({ from: '2026-01-01', to: '2026-06-30' }); expect(q.from).toBe('2026-01-01'); });
});

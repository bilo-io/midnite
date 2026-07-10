import { describe, expect, it } from 'vitest';
import {
  METRICS_WS_PATH,
  MetricsEventSchema,
  MetricsSubscribeMessageSchema,
  SequencedMetricsEventSchema,
} from './metrics.js';

const gauges = {
  queueDepth: 3,
  slotsUsed: 2,
  slotsTotal: 4,
  lastTickLatencyMs: 12.5,
  updatedAt: '2026-07-11T00:00:00.000Z',
};

describe('metrics channel contract', () => {
  it('exposes the ws path', () => {
    expect(METRICS_WS_PATH).toBe('/ws/metrics');
  });

  it('round-trips a metrics.gauges event', () => {
    const event = { type: 'metrics.gauges', gauges } as const;
    expect(MetricsEventSchema.parse(event)).toEqual(event);
  });

  it('allows all-null gauges (nothing sampled yet)', () => {
    const event = {
      type: 'metrics.gauges',
      gauges: { queueDepth: null, slotsUsed: null, slotsTotal: null, lastTickLatencyMs: null, updatedAt: null },
    };
    expect(MetricsEventSchema.safeParse(event).success).toBe(true);
  });

  it('rejects an unknown event type', () => {
    expect(MetricsEventSchema.safeParse({ type: 'metrics.bogus', gauges }).success).toBe(false);
  });

  it('round-trips the sequenced envelope', () => {
    const envelope = { seq: 7, ts: 1_700_000_000_000, ch: 'metrics:all', event: { type: 'metrics.gauges', gauges } };
    const parsed = SequencedMetricsEventSchema.parse(envelope);
    expect(parsed.seq).toBe(7);
    expect(parsed.event.type).toBe('metrics.gauges');
  });

  it('accepts a subscribe and a resume frame', () => {
    expect(MetricsSubscribeMessageSchema.safeParse({ type: 'subscribe' }).success).toBe(true);
    expect(
      MetricsSubscribeMessageSchema.safeParse({ type: 'resume', cursor: { 'metrics:all': 4 } }).success,
    ).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { GaugeStore } from './gauge-store';

describe('GaugeStore', () => {
  it('starts with all-null snapshot', () => {
    const store = new GaugeStore();
    expect(store.snapshot()).toEqual({
      queueDepth: null,
      slots: null,
      lastTickLatencyMs: null,
      updatedAt: null,
    });
  });

  it('recordQueueDepth sets depth and updatedAt', () => {
    const store = new GaugeStore();
    store.recordQueueDepth(5, '2026-06-01T10:00:00.000Z');
    expect(store.snapshot().queueDepth).toBe(5);
    expect(store.snapshot().updatedAt).toBe('2026-06-01T10:00:00.000Z');
  });

  it('recordSlotChange sets used/total', () => {
    const store = new GaugeStore();
    store.recordSlotChange(3, 8, '2026-06-01T10:00:00.000Z');
    expect(store.snapshot().slots).toEqual({ used: 3, total: 8 });
  });

  it('recordTickLatency sets lastTickLatencyMs', () => {
    const store = new GaugeStore();
    store.recordTickLatency(42, '2026-06-01T10:00:00.000Z');
    expect(store.snapshot().lastTickLatencyMs).toBe(42);
  });

  it('each record call updates updatedAt independently', () => {
    const store = new GaugeStore();
    store.recordQueueDepth(1, 't1');
    store.recordSlotChange(2, 4, 't2');
    expect(store.snapshot().updatedAt).toBe('t2');
  });

  it('subsequent calls overwrite previous values', () => {
    const store = new GaugeStore();
    store.recordQueueDepth(3, 't1');
    store.recordQueueDepth(7, 't2');
    expect(store.snapshot().queueDepth).toBe(7);
  });

  it('records for all three gauges coexist', () => {
    const store = new GaugeStore();
    store.recordQueueDepth(2, 't1');
    store.recordSlotChange(1, 4, 't2');
    store.recordTickLatency(15, 't3');
    const snap = store.snapshot();
    expect(snap.queueDepth).toBe(2);
    expect(snap.slots).toEqual({ used: 1, total: 4 });
    expect(snap.lastTickLatencyMs).toBe(15);
  });

  it('snapshot() returns a copy — mutating it does not affect the store', () => {
    const store = new GaugeStore();
    store.recordSlotChange(2, 4, 't1');
    const snap = store.snapshot();
    snap.slots!.used = 99;
    expect(store.snapshot().slots!.used).toBe(2);
  });
});

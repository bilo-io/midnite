import { describe, expect, it, vi } from 'vitest';
import type { MetricsEvent } from '@midnite/shared';
import { MetricsEventBus } from './metrics-event-bus';

const event: MetricsEvent = {
  type: 'metrics.gauges',
  gauges: { queueDepth: 1, slotsUsed: 0, slotsTotal: 2, lastTickLatencyMs: null, updatedAt: 'now' },
};

describe('MetricsEventBus', () => {
  it('delivers emitted events to every subscriber', () => {
    const bus = new MetricsEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe(a);
    bus.subscribe(b);
    bus.emit(event);
    expect(a).toHaveBeenCalledWith(event);
    expect(b).toHaveBeenCalledWith(event);
  });

  it('stops delivering after unsubscribe', () => {
    const bus = new MetricsEventBus();
    const a = vi.fn();
    const off = bus.subscribe(a);
    off();
    bus.emit(event);
    expect(a).not.toHaveBeenCalled();
  });

  it('a throwing subscriber does not break others', () => {
    const bus = new MetricsEventBus();
    const boom = vi.fn(() => {
      throw new Error('bad subscriber');
    });
    const ok = vi.fn();
    bus.subscribe(boom);
    bus.subscribe(ok);
    expect(() => bus.emit(event)).not.toThrow();
    expect(ok).toHaveBeenCalledWith(event);
  });
});

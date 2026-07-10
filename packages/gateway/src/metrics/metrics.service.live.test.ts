import { describe, expect, it, vi } from 'vitest';
import type { MetricsEvent } from '@midnite/shared';
import { MetricsService } from './metrics.service';
import { MetricsEventBus } from './metrics-event-bus';
import type { MetricsRepository } from './metrics.repository';

const fakeRepo = {} as unknown as MetricsRepository;
const flush = () => Promise.resolve(); // let queued microtasks run

describe('MetricsService — live gauge push (Phase 61 F)', () => {
  it('coalesces a burst of gauge writes into a single emit with the latest snapshot', async () => {
    const bus = new MetricsEventBus();
    const seen: MetricsEvent[] = [];
    bus.subscribe((e) => seen.push(e));
    const svc = new MetricsService(fakeRepo, bus);

    svc.recordQueueDepth(5);
    svc.recordTickLatency(20);
    svc.recordSlotChange(1, 4);
    expect(seen).toHaveLength(0); // nothing synchronous — coalesced to a microtask

    await flush();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      type: 'metrics.gauges',
      gauges: { queueDepth: 5, lastTickLatencyMs: 20, slotsUsed: 1, slotsTotal: 4 },
    });
  });

  it('emits again for a change in a later tick', async () => {
    const bus = new MetricsEventBus();
    const emit = vi.fn();
    bus.subscribe(emit);
    const svc = new MetricsService(fakeRepo, bus);

    svc.recordQueueDepth(1);
    await flush();
    svc.recordQueueDepth(2);
    await flush();

    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('is a no-op without a bus (unit-spec construction)', async () => {
    const svc = new MetricsService(fakeRepo);
    expect(() => svc.recordQueueDepth(3)).not.toThrow();
    await flush();
    expect(svc.currentGauges().queueDepth).toBe(3);
  });
});

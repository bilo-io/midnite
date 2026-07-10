import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { MetricsGauges } from '@midnite/shared';

// Capture the handlers the hook registers so the test can drive events.
let captured: { onEvent: (e: unknown) => void; onResync?: () => void } | undefined;
vi.mock('./use-reliable-subscription', () => ({
  useReliableSubscription: (_channel: unknown, handlers: typeof captured) => {
    captured = handlers;
    return { send: () => {} };
  },
}));

import { useLiveGauges } from './use-metrics-events';

afterEach(() => {
  cleanup();
  captured = undefined;
});

const gauges: MetricsGauges = {
  queueDepth: 4,
  slotsUsed: 2,
  slotsTotal: 4,
  lastTickLatencyMs: 9,
  updatedAt: '2026-07-11T00:00:00.000Z',
};

describe('useLiveGauges', () => {
  it('starts null and reflects the latest pushed gauges', () => {
    const { result } = renderHook(() => useLiveGauges());
    expect(result.current).toBeNull();

    act(() => captured?.onEvent({ type: 'metrics.gauges', gauges }));
    expect(result.current).toEqual(gauges);

    const next = { ...gauges, queueDepth: 0 };
    act(() => captured?.onEvent({ type: 'metrics.gauges', gauges: next }));
    expect(result.current).toEqual(next);
  });

  it('clears the live value on a resync gap (falls back to the poll)', () => {
    const { result } = renderHook(() => useLiveGauges());
    act(() => captured?.onEvent({ type: 'metrics.gauges', gauges }));
    expect(result.current).toEqual(gauges);

    act(() => captured?.onResync?.());
    expect(result.current).toBeNull();
  });
});

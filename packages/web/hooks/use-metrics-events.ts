'use client';

import { useEffect, useState } from 'react';
import {
  METRICS_WS_PATH,
  SequencedMetricsEventSchema,
  type MetricsEvent,
  type MetricsGauges,
} from '@midnite/shared';
import { useReliableSubscription, type ReliableChannel } from './use-reliable-subscription';

// Phase 61 F — the live metrics channel over the shared reliable subscription
// (seq + ring + resume from Phase 56). Fleet gauges aren't team-scoped, so a
// plain `{ type: 'subscribe' }` joins the single `metrics:all` line.
const METRICS_CHANNEL: ReliableChannel<MetricsEvent> = {
  path: METRICS_WS_PATH,
  subscribe: () => ({ type: 'subscribe' }),
  decode: (raw) => {
    const parsed = SequencedMetricsEventSchema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { seq: parsed.data.seq, ch: parsed.data.ch, event: parsed.data.event }
      : null;
  },
};

/**
 * Subscribe to live fleet gauges. Returns the latest pushed gauges (or `null`
 * until the first event), so the Ops page can render live state and fall back to
 * its poll when the socket is down / nothing has changed yet. On a resync gap the
 * live value is cleared so the caller falls back to the polled snapshot until the
 * next push.
 */
export function useLiveGauges(): MetricsGauges | null {
  const [gauges, setGauges] = useState<MetricsGauges | null>(null);
  useReliableSubscription(METRICS_CHANNEL, {
    onEvent: (event) => {
      if (event.type === 'metrics.gauges') setGauges(event.gauges);
    },
    onResync: () => setGauges(null),
  });
  // Guard against a stale live value lingering if the hook unmounts/remounts.
  useEffect(() => () => setGauges(null), []);
  return gauges;
}

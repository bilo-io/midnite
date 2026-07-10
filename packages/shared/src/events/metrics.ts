import { z } from 'zod';
import { MetricsGaugesSchema } from '../metrics.js';
import { sequencedEnvelope, SubscribeOrResumeSchema } from './envelope.js';

/**
 * Phase 61 F — the live "metrics" channel on the Phase 56 reliable WebSocket.
 * The gateway publishes a gauge snapshot whenever a fleet gauge changes (queue
 * depth / slots / tick latency), so the Ops page reflects live fleet state
 * without polling. Rides the same seq + ring + resume envelope as the board
 * channels; the client keeps a slow poll as a fallback when the socket is down.
 */
export const METRICS_WS_PATH = '/ws/metrics';

/** A fresh snapshot of the live fleet gauges. */
export const MetricsGaugesEventSchema = z.object({
  type: z.literal('metrics.gauges'),
  gauges: MetricsGaugesSchema,
});
export type MetricsGaugesEvent = z.infer<typeof MetricsGaugesEventSchema>;

/** Discriminated union of everything the metrics channel can emit (one member
 *  today; kept a union so rollup-close / other events can slot in later). */
export const MetricsEventSchema = z.discriminatedUnion('type', [MetricsGaugesEventSchema]);
export type MetricsEvent = z.infer<typeof MetricsEventSchema>;

/** The seq + ring envelope a client actually receives on `/ws/metrics`. */
export const SequencedMetricsEventSchema = sequencedEnvelope(MetricsEventSchema);
export type SequencedMetricsEvent = z.infer<typeof SequencedMetricsEventSchema>;

/** Client → server subscribe/resume frame (shared shape). */
export const MetricsSubscribeMessageSchema = SubscribeOrResumeSchema;

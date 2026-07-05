import { z } from 'zod';

/**
 * Phase 56 A — runtime-adjustable realtime settings.
 *
 * The event ring's size (`ws.ringSize`) has a boot default in `midnite.json`,
 * but an admin can tune it live from Settings → the bigger the ring, the longer
 * a disconnect a client can `resume` from before a full resync is forced
 * (Theme B). The change is in-memory (resets to the config default on restart,
 * like the ring itself), so it's a runtime setting, not persisted config.
 */

/** The ring sizes offered in the Settings select. */
export const WS_RING_SIZES = [256, 512, 1024] as const;
export type WsRingSize = (typeof WS_RING_SIZES)[number];

export const WsSettingsSchema = z.object({
  /** Events retained per scoped channel for resume/replay. */
  ringSize: z.number().int().positive(),
});
export type WsSettings = z.infer<typeof WsSettingsSchema>;

export const WsSettingsResponseSchema = z.object({ settings: WsSettingsSchema });
export type WsSettingsResponse = z.infer<typeof WsSettingsResponseSchema>;

export const UpdateWsSettingsRequestSchema = z.object({
  ringSize: z.union([z.literal(256), z.literal(512), z.literal(1024)]),
});
export type UpdateWsSettingsRequest = z.infer<typeof UpdateWsSettingsRequestSchema>;

/**
 * Phase 56 C — realtime transport health (read-only). Live counters that show
 * how the reliability layer is behaving: how many clients connect, how often a
 * slow client was dropped-to-resync (backpressure), how many dead sockets the
 * heartbeat reaped, and the ring-hit vs. resync-required ratio (0 until Theme B
 * lands the resume protocol).
 */
export const WsMetricsSchema = z.object({
  /** Total live WS connections across all channels. */
  connections: z.number().int().nonnegative(),
  /** Live subscriber count per channel (tasks / ideas / workflows). */
  subscribersByChannel: z.record(z.string(), z.number().int().nonnegative()),
  /** Sockets closed (4014) because their outbound buffer overflowed. */
  droppedToResync: z.number().int().nonnegative(),
  /** Sockets terminated by the heartbeat after missing too many pongs. */
  deadClientsReaped: z.number().int().nonnegative(),
  /** Resume replays served from the ring (Theme B; 0 until then). */
  ringHits: z.number().int().nonnegative(),
  /** Resumes that overflowed the ring → forced a full resync (Theme B; 0 until then). */
  resyncRequired: z.number().int().nonnegative(),
});
export type WsMetrics = z.infer<typeof WsMetricsSchema>;

export const WsMetricsResponseSchema = z.object({ metrics: WsMetricsSchema });
export type WsMetricsResponse = z.infer<typeof WsMetricsResponseSchema>;

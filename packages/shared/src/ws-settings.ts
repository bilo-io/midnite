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

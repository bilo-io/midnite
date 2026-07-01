import { z } from 'zod';

/**
 * Inbound integrations (Phase 46) — the mirror of Phase 44's outbound webhooks.
 *
 * A team registers external systems (GitHub / Linear / a generic signed sender)
 * that may open midnite tasks. Each source has a provider, an event filter, an
 * HMAC signing secret, and optional default repo/project routing. This module is
 * the wire contract; the signed receiver + provider adapters land in later themes.
 * The signing `secret` is **never** in the read shape — returned once on
 * create/rotate, stored encrypted at rest.
 */

/** Which external system feeds this source — selects the verifier + payload adapter. */
export const INBOUND_PROVIDERS = ['github', 'linear', 'generic'] as const;
export const InboundProviderSchema = z.enum(INBOUND_PROVIDERS);
export type InboundProvider = z.infer<typeof InboundProviderSchema>;

/**
 * Curated known event keys per provider — drive the management UI's event picker.
 * `generic` is intentionally open (any string the sender chooses). An empty filter
 * means "accept every event the provider sends".
 */
export const INBOUND_PROVIDER_EVENTS: Record<InboundProvider, readonly string[]> = {
  github: ['issues.opened', 'pull_request.opened'],
  linear: ['Issue.create'],
  generic: [],
};

/**
 * Which provider events create a task. Flat, provider-qualified event keys (e.g.
 * `issues.opened`, `Issue.create`, or any string for `generic`). An **empty**
 * `events` array accepts all events the provider sends.
 */
export const InboundEventFilterSchema = z.object({
  events: z.array(z.string().min(1).max(80)).max(50).default([]),
});
export type InboundEventFilter = z.infer<typeof InboundEventFilterSchema>;

/** A managed inbound source as returned to clients — note: no `secret`. */
export const InboundSourceSchema = z.object({
  id: z.string(),
  teamId: z.string().nullable(),
  createdBy: z.string().nullable(),
  provider: InboundProviderSchema,
  eventFilter: InboundEventFilterSchema,
  defaultRepo: z.string().nullable(),
  defaultProjectId: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InboundSource = z.infer<typeof InboundSourceSchema>;

export const InboundSourceCreateRequestSchema = z.object({
  provider: InboundProviderSchema,
  eventFilter: InboundEventFilterSchema.optional().default({ events: [] }),
  defaultRepo: z.string().max(200).optional(),
  defaultProjectId: z.string().max(200).optional(),
  enabled: z.boolean().optional().default(true),
});
export type InboundSourceCreateRequest = z.infer<typeof InboundSourceCreateRequestSchema>;

export const InboundSourceUpdateRequestSchema = z
  .object({
    provider: InboundProviderSchema,
    eventFilter: InboundEventFilterSchema,
    defaultRepo: z.string().max(200).nullable(),
    defaultProjectId: z.string().max(200).nullable(),
    enabled: z.boolean(),
  })
  .partial();
export type InboundSourceUpdateRequest = z.infer<typeof InboundSourceUpdateRequestSchema>;

/** Create/rotate responses reveal the signing secret exactly once. */
export const InboundSecretResponseSchema = z.object({
  source: InboundSourceSchema,
  secret: z.string(),
});
export type InboundSecretResponse = z.infer<typeof InboundSecretResponseSchema>;

export const InboundSourceResponseSchema = z.object({ source: InboundSourceSchema });
export type InboundSourceResponse = z.infer<typeof InboundSourceResponseSchema>;

export const ListInboundSourcesResponseSchema = z.object({
  sources: z.array(InboundSourceSchema),
});
export type ListInboundSourcesResponse = z.infer<typeof ListInboundSourcesResponseSchema>;

/** The outcome of a received inbound event (Theme B/D). */
export const INBOUND_RESULTS = [
  'created',
  'skipped-duplicate',
  'rejected',
  'ignored',
  'failed',
] as const;
export const InboundResultSchema = z.enum(INBOUND_RESULTS);
export type InboundResult = z.infer<typeof InboundResultSchema>;

/** A recorded inbound delivery — one row per received event (Theme B/D). */
export const InboundDeliverySchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  provider: InboundProviderSchema,
  event: z.string().nullable(),
  externalId: z.string().nullable(),
  result: InboundResultSchema,
  taskId: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
});
export type InboundDelivery = z.infer<typeof InboundDeliverySchema>;

export const ListInboundDeliveriesResponseSchema = z.object({
  deliveries: z.array(InboundDeliverySchema),
});
export type ListInboundDeliveriesResponse = z.infer<typeof ListInboundDeliveriesResponseSchema>;

import { z } from 'zod';

import { StatusSchema } from './task.js';

/**
 * Outbound webhook integrations (Phase 44).
 *
 * A team registers several outbound endpoints, each with a provider format, an
 * event filter, and an HMAC signing secret. This module is the wire contract;
 * delivery + provider formatting land in later themes. The signing `secret` is
 * **never** part of the read shape — it's returned once on create/rotate and
 * stored encrypted at rest.
 */

/** Which receiver an endpoint targets — selects the payload formatter (Theme C). */
export const WEBHOOK_PROVIDERS = ['slack', 'discord', 'generic'] as const;
export const WebhookProviderSchema = z.enum(WEBHOOK_PROVIDERS);
export type WebhookProvider = z.infer<typeof WebhookProviderSchema>;

/** The task-lifecycle events an endpoint can fire on. */
export const WEBHOOK_EVENTS = ['task.created', 'task.updated', 'task.deleted'] as const;
export const WebhookEventSchema = z.enum(WEBHOOK_EVENTS);
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/**
 * Which events fire an endpoint. `statuses` (optional) narrows `task.updated` to
 * transitions *into* those statuses — mirroring Phase 21's `notifyForTask` idea;
 * omitted/empty means every update fires.
 */
export const WebhookEventFilterSchema = z.object({
  events: z.array(WebhookEventSchema).min(1),
  statuses: z.array(StatusSchema).optional(),
});
export type WebhookEventFilter = z.infer<typeof WebhookEventFilterSchema>;

/** A managed endpoint as returned to clients — note: no `secret`. */
export const WebhookSchema = z.object({
  id: z.string(),
  teamId: z.string().nullable(),
  createdBy: z.string().nullable(),
  url: z.string(),
  provider: WebhookProviderSchema,
  eventFilter: WebhookEventFilterSchema,
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Webhook = z.infer<typeof WebhookSchema>;

export const WebhookCreateRequestSchema = z.object({
  url: z.string().url(),
  provider: WebhookProviderSchema,
  eventFilter: WebhookEventFilterSchema,
  enabled: z.boolean().optional().default(true),
});
export type WebhookCreateRequest = z.infer<typeof WebhookCreateRequestSchema>;

export const WebhookUpdateRequestSchema = z
  .object({
    url: z.string().url(),
    provider: WebhookProviderSchema,
    eventFilter: WebhookEventFilterSchema,
    enabled: z.boolean(),
  })
  .partial();
export type WebhookUpdateRequest = z.infer<typeof WebhookUpdateRequestSchema>;

/** Create/rotate responses reveal the signing secret exactly once. */
export const WebhookSecretResponseSchema = z.object({
  webhook: WebhookSchema,
  secret: z.string(),
});
export type WebhookSecretResponse = z.infer<typeof WebhookSecretResponseSchema>;

export const WebhookResponseSchema = z.object({ webhook: WebhookSchema });
export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;

export const ListWebhooksResponseSchema = z.object({ webhooks: z.array(WebhookSchema) });
export type ListWebhooksResponse = z.infer<typeof ListWebhooksResponseSchema>;

/** Outcome of a single delivery attempt-set (Theme B records these; D surfaces them). */
export const WEBHOOK_DELIVERY_STATUSES = ['success', 'failed'] as const;
export const WebhookDeliveryStatusSchema = z.enum(WEBHOOK_DELIVERY_STATUSES);
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatusSchema>;

/**
 * A recorded delivery: which event fired the endpoint, the rendered body that
 * was POSTed (persisted so a redeliver in Theme D is a faithful replay), and the
 * HTTP outcome. The signing secret is never stored here.
 */
export const WebhookDeliverySchema = z.object({
  id: z.string(),
  webhookId: z.string(),
  event: WebhookEventSchema,
  status: WebhookDeliveryStatusSchema,
  /** Final HTTP status code, or null when the request never got a response. */
  responseCode: z.number().nullable(),
  /** How many attempts were made (1–MAX_ATTEMPTS). */
  attempts: z.number(),
  /** Last error message when failed; null on success. */
  error: z.string().nullable(),
  /** The exact request body sent — enables a faithful redeliver. */
  payload: z.string(),
  createdAt: z.string(),
});
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;

export const ListWebhookDeliveriesResponseSchema = z.object({
  deliveries: z.array(WebhookDeliverySchema),
});
export type ListWebhookDeliveriesResponse = z.infer<typeof ListWebhookDeliveriesResponseSchema>;

/** Single-delivery response — returned by "send test" + "redeliver" (Theme D). */
export const WebhookDeliveryResponseSchema = z.object({ delivery: WebhookDeliverySchema });
export type WebhookDeliveryResponse = z.infer<typeof WebhookDeliveryResponseSchema>;

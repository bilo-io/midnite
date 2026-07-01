import type { InboundProvider } from '@midnite/shared';

/** The raw request as the receiver sees it, handed to a provider adapter. */
export interface InboundRequest {
  rawBody: string;
  headers: Record<string, string | undefined>;
  parsed: unknown;
}

/** A normalized task to create from a mapped inbound event. */
export interface MappedTask {
  prompt: string;
  /** Origin issue/PR/item URL — attached to the created task as a Source link. */
  sourceUrl?: string;
}

/**
 * A provider adapter turns one external system's webhook into midnite terms:
 * verify the signature, name the event, extract a dedup id, and map to a task.
 * Pure — no I/O — so each is trivially unit-testable.
 */
export interface InboundAdapter {
  provider: InboundProvider;
  /** HMAC-verify the raw body against the source's decrypted secret. */
  verify(req: InboundRequest, secret: string): boolean;
  /** The provider-qualified event key (e.g. `issues.opened`, `Issue.create`). */
  eventKey(req: InboundRequest): string | null;
  /** A stable delivery/item id for dedup (delivery header, else a payload id). */
  externalId(req: InboundRequest): string | null;
  /** Map a verified, filter-matching payload to a task, or null if unmappable. */
  toTask(req: InboundRequest): MappedTask | null;
}

/** Case-insensitive header lookup (Fastify lowercases, but be defensive). */
export function header(req: InboundRequest, name: string): string | undefined {
  return req.headers[name] ?? req.headers[name.toLowerCase()];
}

/** Best-effort object accessor for adapter payload digging. */
export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

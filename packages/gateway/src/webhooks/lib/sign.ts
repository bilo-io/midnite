import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC-SHA256 webhook signing (Phase 44). The signature covers
 * `${timestamp}.${body}` so a receiver can bound replay by rejecting stale
 * timestamps — the same recipe Stripe/GitHub-style receivers expect.
 *
 * Verification recipe (document for receivers):
 *   signed = `${X-Midnite-Timestamp}.${rawBody}`
 *   expected = "sha256=" + hex(HMAC_SHA256(secret, signed))
 *   constant-time compare with the `X-Midnite-Signature` header.
 */
export const SIGNATURE_HEADER = 'x-midnite-signature';
export const TIMESTAMP_HEADER = 'x-midnite-timestamp';

/** Compute the `sha256=<hex>` signature for a body at a given timestamp. */
export function signPayload(secret: string, body: string, timestamp: string): string {
  const mac = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `sha256=${mac}`;
}

/** Constant-time check that a presented signature matches (used in tests / receivers). */
export function verifySignature(
  secret: string,
  body: string,
  timestamp: string,
  signature: string,
): boolean {
  const expected = signPayload(secret, body, timestamp);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

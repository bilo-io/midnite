import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC verification helpers for the inbound receiver (Phase 46 B/C). Each provider
 * signs differently, but all are HMAC-SHA256 over the **raw** request bytes:
 *   - GitHub  : `X-Hub-Signature-256: sha256=<hex>` over the body
 *   - Linear  : `Linear-Signature: <hex>` over the body
 *   - generic : `X-Midnite-Signature: sha256=<hex>` over `${timestamp}.${body}`
 *               (mirrors Phase 44's outbound signing so a sender can reuse it)
 */

/** Constant-time compare of two strings (length-safe). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** `hex(HMAC_SHA256(secret, data))`. */
export function hmacHex(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/** GitHub: `sha256=<hex over body>`. */
export function verifyGithub(secret: string, rawBody: string, header: string | undefined): boolean {
  if (!header) return false;
  return safeEqual(`sha256=${hmacHex(secret, rawBody)}`, header);
}

/** Linear: bare `<hex over body>`. */
export function verifyLinear(secret: string, rawBody: string, header: string | undefined): boolean {
  if (!header) return false;
  return safeEqual(hmacHex(secret, rawBody), header);
}

/**
 * Generic: `sha256=<hex over `${timestamp}.${body}`>` with the timestamp in a
 * companion header — the same recipe Phase 44 emits on the outbound side.
 */
export function verifyGeneric(
  secret: string,
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined,
): boolean {
  if (!signature || !timestamp) return false;
  return safeEqual(`sha256=${hmacHex(secret, `${timestamp}.${rawBody}`)}`, signature);
}

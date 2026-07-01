import { isSafeHttpUrl } from '../projects/lib/opengraph';

/** Default request timeout per attempt. */
export const DELIVERY_TIMEOUT_MS = 5000;
/** Total attempts before giving up. */
export const DELIVERY_MAX_ATTEMPTS = 3;
/** Base backoff between retries (×attempt): 200ms, 400ms. */
export const DELIVERY_BACKOFF_MS = 200;

export type SafeDeliveryOptions = {
  /** Extra headers merged over `content-type: application/json`. */
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxAttempts?: number;
  backoffMs?: number;
};

export type SafeDeliveryResult = {
  /** True when the endpoint answered with a 2xx within the attempt budget. */
  ok: boolean;
  /** Last HTTP status seen, or null when no response was ever received. */
  responseCode: number | null;
  /** How many attempts were actually made (0 when the URL was rejected up front). */
  attempts: number;
  /** Last error / non-2xx description; null on success. */
  error: string | null;
};

/**
 * SSRF-guarded, bounded-retry POST of a string body to an arbitrary URL — the
 * reusable delivery core shared by Phase 21's notification webhook channel and
 * Phase 44's outbound webhooks. A loopback/private URL is refused (the gateway
 * can't be pointed at internal services); failures are returned, never thrown,
 * so callers stay best-effort. Retries with linear backoff on a non-2xx or a
 * network error.
 */
export async function deliverWebhook(
  url: string,
  body: string,
  opts: SafeDeliveryOptions = {},
): Promise<SafeDeliveryResult> {
  if (!isSafeHttpUrl(url)) {
    return { ok: false, responseCode: null, attempts: 0, error: 'unsafe or invalid URL (SSRF guard)' };
  }

  const timeoutMs = opts.timeoutMs ?? DELIVERY_TIMEOUT_MS;
  const maxAttempts = opts.maxAttempts ?? DELIVERY_MAX_ATTEMPTS;
  const backoffMs = opts.backoffMs ?? DELIVERY_BACKOFF_MS;
  const headers = { 'content-type': 'application/json', ...opts.headers };

  let responseCode: number | null = null;
  let error: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      responseCode = res.status;
      if (res.ok) return { ok: true, responseCode, attempts: attempt, error: null };
      error = `responded ${res.status}`;
    } catch (err) {
      responseCode = null;
      error = err instanceof Error ? err.message : 'unknown delivery error';
    }
    if (attempt < maxAttempts) await delay(backoffMs * attempt);
  }

  return { ok: false, responseCode, attempts: maxAttempts, error };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref?.();
  });
}

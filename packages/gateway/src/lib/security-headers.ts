/**
 * Baseline HTTP security headers set on **every** gateway response (Phase 60 A,
 * auth/transport audit). These are the cheap, behavior-safe defaults: they cost
 * nothing, break no legitimate client, and harden the same-origin surface the
 * gateway exposes — the served web export (`/`) and user-uploaded media
 * (`/uploads/*`), both of which a browser renders in the gateway's own origin.
 *
 * - `X-Content-Type-Options: nosniff` — the highest-value one: stops a browser
 *   MIME-sniffing a user-uploaded attachment (a disguised HTML/JS payload served
 *   from `/uploads/*`) into executable content in the gateway origin.
 * - `X-Frame-Options: SAMEORIGIN` — clickjacking guard for the authed UI (a
 *   local-first single-origin app never needs to be framed cross-origin).
 * - `Referrer-Policy: no-referrer` — never leak gateway URLs (which can carry
 *   ids) to outbound navigations.
 *
 * Deliberately **omitted** (tracked as findings, not quick wins): a
 * `Content-Security-Policy` (must be tuned to the Next static export's inline
 * scripts/styles or it breaks the UI) and `Strict-Transport-Security` (HSTS
 * belongs at the TLS-terminating proxy, not this plain-HTTP loopback listener).
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'no-referrer',
};

/** Minimal shape of the thing headers get written to — a Fastify reply, or any
 *  test double exposing `header(name, value)`. */
type HeaderSink = { header(name: string, value: string): unknown };

/** Apply {@link SECURITY_HEADERS} to a reply. Idempotent; overwrites nothing a
 *  route legitimately sets itself (these three are never set per-route). */
export function applySecurityHeaders(reply: HeaderSink): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    reply.header(name, value);
  }
}

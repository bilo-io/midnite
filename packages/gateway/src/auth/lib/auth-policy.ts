import { timingSafeEqual } from 'node:crypto';
import type { MidniteConfig } from '@midnite/shared';

/**
 * Pure helpers for the optional remote-access auth (Phase 7 A5). No Nest, no
 * I/O beyond reading the passed-in env — so the policy is trivially unit-testable
 * and shared by both the guard and the boot-time fail-closed check.
 */

/**
 * Does `host` bind only the loopback interface? Loopback binds are unreachable
 * off-box, so the unauthenticated default is safe there. `0.0.0.0` / `::` bind
 * every interface (exposed → not loopback); any routable address is not loopback.
 */
export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '::1') return true;
  // 127.0.0.0/8 — the whole loopback block, not just 127.0.0.1.
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h);
}

/**
 * The configured bearer token, read from the env var named by
 * `gateway.auth.tokenEnv`, or null when unset/blank (⇒ auth disabled). The secret
 * is never inlined into committed config, so it only ever lives in the env.
 */
export function resolveAuthToken(
  config: MidniteConfig,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[config.gateway.auth.tokenEnv];
  const token = raw?.trim();
  return token ? token : null;
}

/**
 * Routes exempt from bearer auth: health probes (`/health` liveness alias plus
 * the Phase 54 `/health/live` + `/health/ready`, all hit by orchestrators/monitors
 * that don't carry the bearer), the hook callbacks (`/hooks/*`), which authenticate
 * with their own per-session secret and are called by parties (in-PTY scripts,
 * external webhooks) that don't carry the bearer token, and the `/playground/*`
 * demo API — an echo/canned-data surface used by the example workflows so an HTTP
 * node has a live target without any credential setup. Everything else is protected
 * when auth is on.
 *
 * Case-sensitive on purpose: Fastify route matching is case-sensitive too, so
 * `/HEALTH` neither matches the liveness route nor this exemption — it just gets
 * a 401, which is the safe direction (never a bypass). Don't "fix" it to lowercase.
 */
export function isAuthExemptPath(url: string): boolean {
  const path = url.split('?')[0]!.replace(/\/+$/, '') || '/';
  return (
    path === '/health' ||
    path.startsWith('/health/') ||
    path === '/hooks' ||
    path.startsWith('/hooks/') ||
    path === '/playground' ||
    path.startsWith('/playground/')
  );
}

/**
 * The Phase 46 inbound receiver — `POST /integrations/inbound/:id` — is
 * unauthenticated by session; the provider HMAC signature is the gate. It must be
 * distinguished by **method + shape** from the team-admin management routes that
 * share the `/integrations/inbound` prefix: create is `POST /integrations/inbound`
 * (no id), rotate is `POST /integrations/inbound/:id/rotate`, and update/delete are
 * PATCH/DELETE — none of which match this exact one-segment POST. Rate-limiting
 * still applies (this stays out of `isAuthExemptPath`), which is desirable for a
 * public endpoint.
 */
export function isPublicInboundReceiver(method: string | undefined, url: string): boolean {
  if ((method ?? '').toUpperCase() !== 'POST') return false;
  const path = url.split('?')[0]!.replace(/\/+$/, '') || '/';
  return /^\/integrations\/inbound\/[^/]+$/.test(path);
}

/** True when an `Authorization` header carries the expected bearer token. */
export function isValidBearer(header: string | string[] | undefined, token: string): boolean {
  const presented = bearerTokenFromHeader(Array.isArray(header) ? header[0] : header);
  return presented !== null && safeEqual(presented, token);
}

/** The token from an `Authorization: Bearer <token>` header, or null. */
export function bearerTokenFromHeader(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer[ ]+(.+)$/i.exec(header.trim());
  return match ? match[1]!.trim() : null;
}

/** Constant-time string compare (length-aware; a length mismatch is an early no). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

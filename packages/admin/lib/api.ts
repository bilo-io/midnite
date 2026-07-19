import {
  AdminUserSummarySchema,
  AdminTeamSummarySchema,
  PlatformOverviewSchema,
  LoginProviderSchema,
  UserSchema,
  type AdminUserSummary,
  type AdminTeamSummary,
  type PlatformOverview,
  type LoginProvider,
  type User,
} from '@midnite/shared';
import { z } from 'zod';

// Admin is a pure HTTP client of the gateway (like web) — it never imports gateway
// internals; every shape is a `@midnite/shared` zod schema. This is the MINIMAL
// surface the operator console needs: the auth reads (session + SSO), and the
// operator-gated `/admin/*` reads.

let _accessToken: string | null = null;

/** Set the JWT access token used for all authenticated gateway requests. */
export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

/** Get the current access token (for use in direct fetch calls). */
export function getAccessToken(): string | null {
  return _accessToken;
}

/** The gateway origin. Overridable at build/runtime via `NEXT_PUBLIC_GATEWAY_URL`. */
export function gatewayUrl(): string {
  if (typeof window === 'undefined') {
    return process.env['NEXT_PUBLIC_GATEWAY_URL'] ?? 'http://localhost:7777';
  }
  return (
    (window as unknown as { __NEXT_PUBLIC_GATEWAY_URL?: string }).__NEXT_PUBLIC_GATEWAY_URL ??
    process.env['NEXT_PUBLIC_GATEWAY_URL'] ??
    'http://localhost:7777'
  );
}

/**
 * A failed gateway request. Carries the HTTP `status` so callers can branch on it
 * (the operator gate maps 403 → not-operator); `message` is the gateway error.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  schema?: { parse: (value: unknown) => T },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (_accessToken) headers['authorization'] = `Bearer ${_accessToken}`;
  const extra = init?.headers as Record<string, string> | undefined;
  if (extra) Object.assign(headers, extra);
  // `credentials: 'include'` sends the gateway's SSO refresh cookie cross-origin
  // (admin is a static app on its own origin) so `/auth/me` can restore a session.
  const res = await fetch(`${gatewayUrl()}${path}`, {
    cache: 'no-store',
    credentials: 'include',
    ...init,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(errorMessage(res, text), res.status);
  }
  const body = (await res.json()) as unknown;
  return schema ? schema.parse(body) : (body as T);
}

/** Turn a failed Nest response (`{ statusCode, message, error }`) into readable text. */
function errorMessage(res: Response, text: string): string {
  if (text) {
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message) return parsed.message;
      if (Array.isArray(parsed.message) && parsed.message.length > 0) return parsed.message.join(', ');
    } catch {
      // Not JSON — fall through to the raw text below.
    }
    return text;
  }
  return `${res.status} ${res.statusText}`;
}

// ── Auth ────────────────────────────────────────────────────────────────────

/** The authenticated user (`GET /auth/me`). Throws `ApiError` (401 when signed out). */
export async function getCurrentUser(): Promise<User> {
  const data = await fetchJson('/auth/me', undefined, z.object({ user: UserSchema }));
  return data.user;
}

/**
 * Browser URL that starts the Google/GitHub login flow — navigate the browser here
 * (an anchor). The gateway 302s to the provider consent screen, then back to the
 * callback. `redirect` is the same-origin path to land on after login.
 */
export function ssoStartUrl(provider: LoginProvider, redirect?: string): string {
  const qs = redirect ? `?${new URLSearchParams({ redirect }).toString()}` : '';
  return `${gatewayUrl()}/auth/sso/${encodeURIComponent(provider)}/start${qs}`;
}

/**
 * Which SSO providers the gateway is configured for (`GET /auth/sso/providers`).
 * Returns `[]` on any failure so the login screen simply shows the fallback set.
 */
export async function fetchSsoProviders(): Promise<LoginProvider[]> {
  try {
    const res = await fetch(`${gatewayUrl()}/auth/sso/providers`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { providers?: unknown };
    const parsed = LoginProviderSchema.array().safeParse(data.providers);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

// ── Operator-gated reads (`GET /admin/*`, `@RequiresOperator` → 403) ──────────

/** The result of probing the operator-gated surface (see `probeOperator`). */
export type OperatorProbe = 'operator' | 'forbidden' | 'unknown';

/**
 * Probe the operator-gated `GET /admin/overview` to classify the current session:
 *  - HTTP 200 → the account is an operator;
 *  - HTTP 403 → authenticated but not an operator;
 *  - anything else / network error → unknown (caller treats as loading/retry).
 * This is the thin seam wired to Theme D's `@RequiresOperator` gate — there is no
 * `isOperator` field on `/auth/me`, so access itself is the signal.
 */
export async function probeOperator(signal?: AbortSignal): Promise<OperatorProbe> {
  try {
    const headers: Record<string, string> = {};
    if (_accessToken) headers['authorization'] = `Bearer ${_accessToken}`;
    const res = await fetch(`${gatewayUrl()}/admin/overview`, {
      cache: 'no-store',
      credentials: 'include',
      signal,
      headers,
    });
    if (res.ok) return 'operator';
    if (res.status === 403) return 'forbidden';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Platform KPIs for the Overview page (`GET /admin/overview`). Operator-only. */
export async function getAdminOverview(signal?: AbortSignal): Promise<PlatformOverview> {
  return fetchJson('/admin/overview', { signal }, PlatformOverviewSchema);
}

/** Every user on the platform (`GET /admin/users`). Operator-only, cross-tenant. */
export async function getAdminUsers(signal?: AbortSignal): Promise<AdminUserSummary[]> {
  return fetchJson('/admin/users', { signal }, z.array(AdminUserSummarySchema));
}

/** Every team on the platform (`GET /admin/teams`). Operator-only, cross-tenant. */
export async function getAdminTeams(signal?: AbortSignal): Promise<AdminTeamSummary[]> {
  return fetchJson('/admin/teams', { signal }, z.array(AdminTeamSummarySchema));
}

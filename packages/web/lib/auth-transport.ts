import type { User } from '@midnite/shared';
import { gatewayUrl } from '@/lib/api';

/**
 * Auth transport — two modes, one interface (Phase 77).
 *
 * The hosted web deployment runs a real Next server, so auth goes through the
 * `/api/auth/*` **BFF** route handlers that keep the refresh token in an httpOnly
 * cookie. The **desktop** app serves a *static export* (no Next server → those
 * route handlers don't exist) against a loopback **embedded gateway**, so it talks
 * to the gateway's `/auth/*` endpoints **directly** and keeps the refresh token in
 * `localStorage`. On a single-user loopback machine that storage is an acceptable
 * threat model, and it's the only option without a server to hold the cookie.
 *
 * Mode is detected by the desktop marker `window.__NEXT_PUBLIC_GATEWAY_URL` (injected
 * by the Electron preload). Absent ⇒ BFF mode (behaviour-preserving for the web).
 */

const RT_KEY = 'midnite.refreshToken';

/** True when running as the desktop app talking to the embedded gateway directly. */
export function isDesktopAuth(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean((window as { __NEXT_PUBLIC_GATEWAY_URL?: string }).__NEXT_PUBLIC_GATEWAY_URL)
  );
}

function getStoredRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(RT_KEY);
  } catch {
    return null;
  }
}

function storeRefreshToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(RT_KEY, token);
    else window.localStorage.removeItem(RT_KEY);
  } catch {
    // localStorage unavailable (private mode / disabled) — non-fatal; the session
    // just won't survive a reload. Login still works for the current session.
  }
}

export interface Session {
  accessToken: string;
  user: User;
}

/** Normalised refresh outcome the AuthProvider branches on (mirrors the BFF's status
 *  contract: 200 restored, 401 auth-on-not-logged-in, anything else auth-off/local). */
export interface RefreshOutcome {
  status: number;
  session?: Session;
}

type GatewayAuthResponse = { accessToken?: string; refreshToken?: string; user?: User };

/**
 * Restore the session on mount. BFF: POST `/api/auth/refresh` (cookie). Desktop: POST
 * the gateway's `/auth/refresh` with the stored token (or a non-empty placeholder so
 * the gateway's `enabled` check — which runs *before* body validation — still fires):
 *   200 → logged in (rotate + store the new token) · 401 → JWT on, not logged in ·
 *   400/other → JWT disabled (local mode); clear any stale token.
 */
export async function refreshSession(): Promise<RefreshOutcome> {
  if (!isDesktopAuth()) {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (res.ok) return { status: 200, session: (await res.json()) as Session };
    return { status: res.status };
  }

  let res: Response;
  try {
    res = await fetch(`${gatewayUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: getStoredRefreshToken() ?? 'unauthenticated' }),
    });
  } catch {
    return { status: 503 };
  }
  if (res.ok) {
    const data = (await res.json()) as GatewayAuthResponse;
    storeRefreshToken(data.refreshToken ?? null);
    return { status: 200, session: { accessToken: data.accessToken ?? '', user: data.user as User } };
  }
  // 401 (not logged in) or 400 (JWT disabled): either way there's no live session.
  storeRefreshToken(null);
  return { status: res.status };
}

/** Password login. BFF: `/api/auth/login`. Desktop: gateway `/auth/login` + store the
 *  refresh token. Throws with the gateway/BFF message on failure. */
export async function loginSession(email: string, password: string): Promise<Session> {
  if (!isDesktopAuth()) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(data?.message ?? 'Login failed');
    }
    return (await res.json()) as Session;
  }

  const res = await fetch(`${gatewayUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? 'Login failed');
  }
  const data = (await res.json()) as GatewayAuthResponse;
  storeRefreshToken(data.refreshToken ?? null);
  return { accessToken: data.accessToken ?? '', user: data.user as User };
}

/** Register a new account. Returns the created user (login is a separate step, as in
 *  the BFF flow). Desktop hits the gateway directly. */
export async function registerAccount(email: string, name: string, password: string): Promise<User> {
  const path = isDesktopAuth() ? `${gatewayUrl()}/auth/register` : '/api/auth/register';
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? 'Registration failed');
  }
  const data = (await res.json()) as { user: User };
  return data.user;
}

/** End the session. Desktop revokes at the gateway and drops the stored token. */
export async function logoutSession(accessToken: string | null): Promise<void> {
  const path = isDesktopAuth() ? `${gatewayUrl()}/auth/logout` : '/api/auth/logout';
  await fetch(path, {
    method: 'POST',
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  }).catch(() => undefined);
  if (isDesktopAuth()) storeRefreshToken(null);
}

/**
 * Exchange an SSO one-time code for a session. BFF: `/api/auth/sso/callback` (sets the
 * cookie). Desktop: the gateway's `/auth/sso/exchange` + store the refresh token, so
 * the subsequent full navigation restores the session via {@link refreshSession}.
 * Returns the gateway error `message` (never throws) so the callback page can route to
 * `/login?sso_error=…` exactly as before.
 */
export async function exchangeSsoCode(code: string): Promise<{ ok: boolean; message?: string }> {
  if (!isDesktopAuth()) {
    const res = await fetch('/api/auth/sso/callback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: data?.message ?? 'exchange_failed' };
  }

  let res: Response;
  try {
    res = await fetch(`${gatewayUrl()}/auth/sso/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  } catch {
    return { ok: false, message: 'gateway_unavailable' };
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: data?.message ?? 'exchange_failed' };
  }
  const data = (await res.json()) as GatewayAuthResponse;
  if (!data.refreshToken) return { ok: false, message: 'exchange_failed' };
  storeRefreshToken(data.refreshToken);
  return { ok: true };
}

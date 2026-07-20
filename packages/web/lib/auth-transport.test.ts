import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  gatewayUrl: () => 'http://127.0.0.1:9999',
}));

import { exchangeSsoCode, isDesktopAuth, loginSession, refreshSession } from './auth-transport';

const GW = 'http://127.0.0.1:9999';

function setDesktop(on: boolean): void {
  if (on) {
    (window as { __NEXT_PUBLIC_GATEWAY_URL?: string }).__NEXT_PUBLIC_GATEWAY_URL = GW;
  } else {
    delete (window as { __NEXT_PUBLIC_GATEWAY_URL?: string }).__NEXT_PUBLIC_GATEWAY_URL;
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});
afterEach(() => setDesktop(false));

describe('isDesktopAuth', () => {
  it('is false in the hosted web (no injected gateway URL)', () => {
    setDesktop(false);
    expect(isDesktopAuth()).toBe(false);
  });
  it('is true when the desktop preload injected the gateway URL', () => {
    setDesktop(true);
    expect(isDesktopAuth()).toBe(true);
  });
});

describe('refreshSession — hosted (BFF)', () => {
  it('POSTs the BFF route and returns the session on 200', async () => {
    setDesktop(false);
    const session = { accessToken: 'a', user: { id: 'u1' } };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, session));
    vi.stubGlobal('fetch', fetchMock);
    const out = await refreshSession();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/refresh', { method: 'POST' });
    expect(out).toEqual({ status: 200, session });
  });
});

describe('refreshSession — desktop (direct to gateway)', () => {
  it('sends the stored token to the gateway and stores the rotated one on 200', async () => {
    setDesktop(true);
    window.localStorage.setItem('midnite.refreshToken', 'old-rt');
    const body = { accessToken: 'a', refreshToken: 'new-rt', user: { id: 'u1' } };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, body));
    vi.stubGlobal('fetch', fetchMock);

    const out = await refreshSession();

    expect(fetchMock).toHaveBeenCalledWith(
      `${GW}/auth/refresh`,
      expect.objectContaining({ method: 'POST' }),
    );
    const sentBody = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
    expect(sentBody).toEqual({ refreshToken: 'old-rt' });
    expect(out.status).toBe(200);
    expect(out.session).toEqual({ accessToken: 'a', user: { id: 'u1' } });
    expect(window.localStorage.getItem('midnite.refreshToken')).toBe('new-rt');
  });

  it('maps 400 (JWT disabled) to local mode and clears any stale token', async () => {
    setDesktop(true);
    window.localStorage.setItem('midnite.refreshToken', 'stale');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { message: 'JWT auth is not enabled' })));
    const out = await refreshSession();
    expect(out.status).toBe(400);
    expect(out.session).toBeUndefined();
    expect(window.localStorage.getItem('midnite.refreshToken')).toBeNull();
  });

  it('maps 401 to auth-on-not-logged-in and clears the token', async () => {
    setDesktop(true);
    window.localStorage.setItem('midnite.refreshToken', 'expired');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { message: 'revoked' })));
    const out = await refreshSession();
    expect(out.status).toBe(401);
    expect(window.localStorage.getItem('midnite.refreshToken')).toBeNull();
  });

  it('uses a non-empty placeholder when no token is stored (so the gateway enabled-check fires)', async () => {
    setDesktop(true);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, {}));
    vi.stubGlobal('fetch', fetchMock);
    await refreshSession();
    const sentBody = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
    expect(sentBody.refreshToken).toBeTruthy();
  });
});

describe('loginSession — desktop', () => {
  it('stores the refresh token and returns the session', async () => {
    setDesktop(true);
    const body = { accessToken: 'acc', refreshToken: 'rt', user: { id: 'u1' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, body)));
    const session = await loginSession('a@b.co', 'pw');
    expect(session).toEqual({ accessToken: 'acc', user: { id: 'u1' } });
    expect(window.localStorage.getItem('midnite.refreshToken')).toBe('rt');
  });
});

describe('exchangeSsoCode — desktop', () => {
  it('stores the refresh token from the gateway exchange', async () => {
    setDesktop(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { accessToken: 'a', refreshToken: 'rt', user: {} })));
    const out = await exchangeSsoCode('code123');
    expect(out.ok).toBe(true);
    expect(window.localStorage.getItem('midnite.refreshToken')).toBe('rt');
  });

  it('returns the gateway error message on failure', async () => {
    setDesktop(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { message: 'exchange_failed' })));
    const out = await exchangeSsoCode('bad');
    expect(out).toEqual({ ok: false, message: 'exchange_failed' });
  });
});

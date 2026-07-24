import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

function req(cookie?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/refresh', {
    method: 'POST',
    headers: cookie ? { cookie: `__midnite_rt=${cookie}` } : {},
  });
}

function gatewayJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('refresh BFF route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rotates the cookie and returns the session on 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => gatewayJson({ accessToken: 'a', refreshToken: 'rt-new', user: { id: 'u1' } })),
    );
    const res = await POST(req('rt-old'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { accessToken?: string; user?: { id?: string } };
    expect(json.accessToken).toBe('a');
    expect(json.user?.id).toBe('u1');
    expect(res.cookies.get('__midnite_rt')?.value).toBe('rt-new');
  });

  it('sends a placeholder refresh token to the gateway when there is no cookie, so its JWT-enabled check still fires', async () => {
    const fetchMock = vi.fn().mockResolvedValue(gatewayJson({ message: 'JWT auth is not enabled' }, 400));
    vi.stubGlobal('fetch', fetchMock);
    await POST(req());
    const sentBody = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body) as {
      refreshToken?: string;
    };
    expect(sentBody.refreshToken).toBeTruthy();
  });

  it('passes through a 400 (JWT disabled) instead of assuming a logged-out session', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => gatewayJson({ message: 'JWT auth is not enabled' }, 400)));
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(((await res.json()) as { message?: string }).message).toBe('no_cookie');
    expect(res.cookies.get('__midnite_rt')).toBeUndefined();
  });

  it('401s with session_expired and clears the cookie when the gateway rejects a real token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => gatewayJson({ message: 'revoked' }, 401)));
    const res = await POST(req('stale'));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { message?: string }).message).toBe('session_expired');
    // Deleting a cookie sets it with an empty value / immediate expiry, rather than
    // removing the header entirely — assert on that instead of `.get()` returning undefined.
    expect(res.cookies.get('__midnite_rt')?.value).toBe('');
  });

  it('503s when the gateway is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );
    const res = await POST(req('rt-old'));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { message?: string }).message).toBe('gateway_unavailable');
  });
});

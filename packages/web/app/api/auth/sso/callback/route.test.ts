import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/sso/callback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function gatewayJson(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 400,
    headers: { 'content-type': 'application/json' },
  });
}

describe('SSO callback BFF route', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => gatewayJson({ accessToken: 'a', refreshToken: 'rt-123', user: { id: 'u1' } })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges the code, sets the httpOnly cookie, and returns the access token + user', async () => {
    const res = await POST(req({ code: 'CODE' }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { accessToken?: string; user?: { id?: string } };
    expect(json.accessToken).toBe('a');
    expect(json.user?.id).toBe('u1');
    const cookie = res.cookies.get('__midnite_rt');
    expect(cookie?.value).toBe('rt-123');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
  });

  it('400s with missing_code when no code is present', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { message?: string }).message).toBe('missing_code');
    expect(res.cookies.get('__midnite_rt')).toBeUndefined();
  });

  it('401s with exchange_failed when the gateway rejects the code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => gatewayJson({ message: 'bad' }, false)));
    const res = await POST(req({ code: 'STALE' }));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { message?: string }).message).toBe('exchange_failed');
    expect(res.cookies.get('__midnite_rt')).toBeUndefined();
  });

  it('401s with exchange_failed when the gateway omits a refresh token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => gatewayJson({ accessToken: 'a', user: {} })));
    const res = await POST(req({ code: 'CODE' }));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { message?: string }).message).toBe('exchange_failed');
  });

  it('503s with gateway_unavailable when the exchange throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('down');
    }));
    const res = await POST(req({ code: 'X' }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { message?: string }).message).toBe('gateway_unavailable');
  });
});

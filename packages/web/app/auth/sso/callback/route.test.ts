import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

function req(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/auth/sso/callback${query}`);
}

function gatewayJson(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 400,
    headers: { 'content-type': 'application/json' },
  });
}

describe('SSO callback route', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => gatewayJson({ refreshToken: 'rt-123', accessToken: 'a', user: {} })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges the code, sets the httpOnly cookie, and redirects to the resume path', async () => {
    const res = await GET(req('?code=CODE&redirect=/board'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:3000/board');
    const cookie = res.cookies.get('__midnite_rt');
    expect(cookie?.value).toBe('rt-123');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
  });

  it('rejects an open-redirect and falls back to "/"', async () => {
    const res = await GET(req('?code=CODE&redirect=https://evil.com'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
    expect(res.cookies.get('__midnite_rt')?.value).toBe('rt-123');
  });

  it('redirects to login with missing_code when no code is present', async () => {
    const res = await GET(req('?redirect=/board'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?sso_error=missing_code');
    expect(res.cookies.get('__midnite_rt')).toBeUndefined();
  });

  it('redirects to login with exchange_failed when the gateway rejects the code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => gatewayJson({ message: 'bad' }, false)));
    const res = await GET(req('?code=STALE&redirect=/'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?sso_error=exchange_failed');
  });

  it('redirects to login with gateway_unavailable when the exchange throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const res = await GET(req('?code=X&redirect=/'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?sso_error=gateway_unavailable');
  });
});

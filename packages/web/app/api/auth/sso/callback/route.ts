import { type NextRequest, NextResponse } from 'next/server';
import { gatewayUrl } from '@/lib/api';

// SSO callback (BFF half). The gateway 302s the browser to the web app's
// `/auth/sso/callback` **page** with a one-time `code`; that client page POSTs the
// code here. We exchange it server-side for the session, set the `__midnite_rt`
// httpOnly cookie exactly like the login route, and return the access token + user.
//
// This is a POST route handler (not the browser-facing GET the gateway redirects
// to) on purpose: `next.config.mjs` sets `output: 'export'`, and a static export
// silently skips POST-only route files — so this builds fine, like the sibling
// `/api/auth/*` handlers — while a real Next server (the hosted, auth-on mode)
// still runs it. A GET route handler here would fail the export ("dynamic … not
// configured"), which is what broke the previous implementation.

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code;
  if (!code) {
    return NextResponse.json({ message: 'missing_code' }, { status: 400 });
  }

  let gRes: Response;
  try {
    gRes = await fetch(`${gatewayUrl()}/auth/sso/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  } catch {
    return NextResponse.json({ message: 'gateway_unavailable' }, { status: 503 });
  }
  if (!gRes.ok) {
    return NextResponse.json({ message: 'exchange_failed' }, { status: 401 });
  }

  const data = (await gRes.json()) as {
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  };
  if (!data.refreshToken) {
    return NextResponse.json({ message: 'exchange_failed' }, { status: 401 });
  }

  const res = NextResponse.json({ accessToken: data.accessToken, user: data.user });
  res.cookies.set('__midnite_rt', data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}

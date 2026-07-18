import { type NextRequest, NextResponse } from 'next/server';
import { SsoRedirectPathSchema } from '@midnite/shared';
import { gatewayUrl } from '@/lib/api';

// The gateway's SSO callback 302s the browser here with a one-time `code` + the
// same-origin `redirect` path (Phase 70 C). This GET route handler exchanges the
// code server-side for the session, sets the `__midnite_rt` httpOnly cookie exactly
// like the login route, and 303s to the (re-validated) redirect. No token ever
// touches client JS or a URL. Mirrors the existing `app/api/auth/*` route handlers
// (no dynamic opt-in, so the `output: 'export'` build treats it the same way).

/** Re-validate the resume path (open-redirect guard); default to "/". */
function safeRedirect(raw: string | null): string {
  if (!raw) return '/';
  return SsoRedirectPathSchema.safeParse(raw).success ? raw : '/';
}

function toLogin(req: NextRequest, ssoError: string): NextResponse {
  const url = new URL('/login', req.url);
  url.searchParams.set('sso_error', ssoError);
  return NextResponse.redirect(url, 303);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const redirect = safeRedirect(req.nextUrl.searchParams.get('redirect'));
  if (!code) return toLogin(req, 'missing_code');

  let gRes: Response;
  try {
    gRes = await fetch(`${gatewayUrl()}/auth/sso/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  } catch {
    return toLogin(req, 'gateway_unavailable');
  }
  if (!gRes.ok) return toLogin(req, 'exchange_failed');

  const data = (await gRes.json()) as { refreshToken?: string };
  if (!data.refreshToken) return toLogin(req, 'exchange_failed');

  const res = NextResponse.redirect(new URL(redirect, req.url), 303);
  res.cookies.set('__midnite_rt', data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}

import { type NextRequest, NextResponse } from 'next/server';
import { gatewayUrl } from '@/lib/api';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('__midnite_rt')?.value;

  let gRes: Response;
  try {
    gRes = await fetch(`${gatewayUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // A non-empty placeholder when there's no cookie still reaches the
      // gateway's `enabled` check (which runs before body validation) — mirrors
      // the desktop transport (lib/auth-transport.ts) so a JWT-disabled gateway
      // correctly reports 400 here too, instead of us assuming "logged out"
      // (401) for every anonymous visitor and forcing a spurious /login redirect.
      body: JSON.stringify({ refreshToken: refreshToken ?? 'unauthenticated' }),
    });
  } catch {
    return NextResponse.json({ message: 'gateway_unavailable' }, { status: 503 });
  }

  if (!gRes.ok) {
    const res = NextResponse.json(
      { message: refreshToken ? 'session_expired' : 'no_cookie' },
      { status: gRes.status },
    );
    if (refreshToken) res.cookies.delete('__midnite_rt');
    return res;
  }

  const data = (await gRes.json()) as { accessToken: string; refreshToken: string; user: unknown };

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

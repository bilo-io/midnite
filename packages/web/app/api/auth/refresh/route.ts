import { type NextRequest, NextResponse } from 'next/server';
import { gatewayUrl } from '@/lib/api';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('__midnite_rt')?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'no_cookie' }, { status: 401 });
  }

  let gRes: Response;
  try {
    gRes = await fetch(`${gatewayUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return NextResponse.json({ message: 'gateway_unavailable' }, { status: 503 });
  }

  if (!gRes.ok) {
    const res = NextResponse.json({ message: 'session_expired' }, { status: 401 });
    res.cookies.delete('__midnite_rt');
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

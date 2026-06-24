import { type NextRequest, NextResponse } from 'next/server';
import { gatewayUrl } from '@/lib/api';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as unknown;

  const gRes = await fetch(`${gatewayUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await gRes.text();
  const data = JSON.parse(text) as { accessToken?: string; refreshToken?: string; user?: unknown; message?: string };

  if (!gRes.ok) {
    return NextResponse.json({ message: data.message ?? 'Login failed' }, { status: gRes.status });
  }

  const res = NextResponse.json({ accessToken: data.accessToken, user: data.user });
  res.cookies.set('__midnite_rt', data.refreshToken ?? '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}

import { type NextRequest, NextResponse } from 'next/server';
import { gatewayUrl } from '@/lib/api';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (authHeader) {
    // Best-effort revocation on the gateway — don't block logout on failure.
    await fetch(`${gatewayUrl()}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: authHeader },
    }).catch(() => undefined);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete('__midnite_rt');
  return res;
}

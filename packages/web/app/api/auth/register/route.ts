import { type NextRequest, NextResponse } from 'next/server';
import { gatewayUrl } from '@/lib/api';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as unknown;

  const gRes = await fetch(`${gatewayUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await gRes.text();
  return NextResponse.json(JSON.parse(text) as unknown, { status: gRes.status });
}

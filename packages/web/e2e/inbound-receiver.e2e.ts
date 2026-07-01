import { createHmac } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { GATEWAY_ORIGIN } from './config';

/**
 * Phase 46 B/C — the signed inbound receiver, end-to-end against the real gateway.
 * This is the one path unit tests can't cover: the Fastify raw-body capture (the
 * flagged technical risk) + the method-scoped auth exemption + the full
 * verify→create flow. The e2e gateway runs JWT-disabled, so the management routes
 * are open (null team) and a created source's secret comes back once.
 */

function sign(secret: string, body: string, timestamp: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

async function createGenericSource(): Promise<{ id: string; secret: string }> {
  const res = await fetch(`${GATEWAY_ORIGIN}/integrations/inbound`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'generic', eventFilter: { events: [] }, enabled: true }),
  });
  expect(res.status).toBeLessThan(300);
  const json = (await res.json()) as { source: { id: string }; secret: string };
  return { id: json.source.id, secret: json.secret };
}

test.describe('inbound receiver', () => {
  test('a correctly-signed generic payload creates a task; bad sig 401; duplicate skipped', async () => {
    const { id, secret } = await createGenericSource();
    const url = `${GATEWAY_ORIGIN}/integrations/inbound/${id}`;

    const body = JSON.stringify({
      event: 'ticket.new',
      externalId: 'ext-abc',
      title: 'Inbound e2e task',
      body: 'created from a signed inbound event',
      url: 'https://example.com/ticket/1',
    });
    const ts = '1782839600000';

    // 1) Verified event → task created.
    const ok = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-midnite-signature': sign(secret, body, ts),
        'x-midnite-timestamp': ts,
      },
      body,
    });
    expect(ok.status).toBe(201);
    const okJson = (await ok.json()) as { result: string; taskId?: string };
    expect(okJson.result).toBe('created');
    expect(okJson.taskId).toBeTruthy();

    // The task is on the board with the mapped title (`GET /tasks` is a bare array).
    const tasksRes = await fetch(`${GATEWAY_ORIGIN}/tasks`);
    const tasks = (await tasksRes.json()) as Array<{ id: string; title: string }>;
    expect(tasks.some((t) => t.title === 'Inbound e2e task')).toBe(true);

    // 2) A tampered body (bad signature) → 401, no task.
    const bad = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-midnite-signature': sign(secret, body, ts),
        'x-midnite-timestamp': ts,
      },
      body: `${body} `, // one byte off → signature no longer matches
    });
    expect(bad.status).toBe(401);

    // 3) A redelivery of the same externalId → skipped-duplicate (no second task).
    const dup = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-midnite-signature': sign(secret, body, ts),
        'x-midnite-timestamp': ts,
      },
      body,
    });
    expect(dup.status).toBe(201);
    expect(((await dup.json()) as { result: string }).result).toBe('skipped-duplicate');
  });
});

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { GATEWAY_ORIGIN, WEB_ORIGIN } from './config';

/**
 * Phase 64 Theme H — the multiplayer-presence flow smoke, across **two browser
 * contexts** on `/office`.
 *
 * The presence *contract* (see each other, emote propagates, ghost hides one) is
 * driven over the **real presence WebSocket** against the live gateway, rather
 * than through the Phaser canvas: the scene's move source is its `update()` loop,
 * and headless Chromium throttles a backgrounded tab's rAF to a crawl (and dev
 * StrictMode double-mounts the socket), so canvas-driven position publishing is
 * too flaky to assert on. Opening the wire directly from each context is both
 * deterministic and a truer check of the cross-context server behaviour — snapshot
 * on join, coalesced peer-updates, emote fan-out, and the mid-session ghost
 * retraction (Theme H's own gateway fix) — end to end.
 *
 * A second test keeps the solo-regression: the `/office` presence HUD mounts and
 * shows just "You" with no peers (the existing `office.e2e.ts` canvas smoke stays
 * unedited alongside it).
 */

const PRESENCE_WS = `${GATEWAY_ORIGIN.replace(/^http/, 'ws')}/ws/presence`;

type Hello = { name: string; ghost?: boolean };

/** Load `/office` in a fresh context (wizard + screensaver suppressed). */
async function openOffice(context: BrowserContext): Promise<Page> {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86400 }));
    } catch {
      // web storage may be unavailable — best effort.
    }
  });
  const page = await context.newPage();
  await page.goto('/office');
  await expect(page.getByRole('heading', { name: 'Office', exact: true })).toBeVisible();
  return page;
}

/** Open a presence socket from inside the page (origin = the app) and collect frames. */
async function connectPresence(page: Page, url: string, hello: Hello): Promise<void> {
  await page.evaluate(
    async ({ url, hello }) => {
      const w = window as unknown as { __frames: unknown[]; __ws: WebSocket };
      const ws = new WebSocket(url);
      w.__frames = [];
      ws.addEventListener('message', (e) => w.__frames.push(JSON.parse(e.data as string)));
      await new Promise<void>((resolve, reject) => {
        ws.addEventListener('open', () => resolve());
        ws.addEventListener('error', () => reject(new Error('presence ws error')));
      });
      w.__ws = ws;
      ws.send(JSON.stringify({ type: 'presence.hello', name: hello.name, variant: 0, tint: null, ghost: !!hello.ghost }));
    },
    { url, hello },
  );
}

async function sendPresence(page: Page, msg: Record<string, unknown>): Promise<void> {
  await page.evaluate((m) => (window as unknown as { __ws: WebSocket }).__ws.send(JSON.stringify(m)), msg);
}

function frames(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(() => (window as unknown as { __frames: Array<Record<string, unknown>> }).__frames ?? []);
}

/** Names of every renderable peer this client has been told about. */
async function peerNames(page: Page): Promise<string[]> {
  const fs = await frames(page);
  const names = new Set<string>();
  for (const f of fs) {
    if (f['type'] === 'presence.snapshot' || f['type'] === 'presence.peer-updated') {
      for (const p of (f['peers'] as Array<{ name: string }>) ?? []) names.add(p.name);
    }
  }
  return [...names];
}

async function selfId(page: Page): Promise<string> {
  const fs = await frames(page);
  const snap = fs.find((f) => f['type'] === 'presence.snapshot');
  return (snap?.['selfId'] as string) ?? '';
}

test.describe('Office presence (two contexts)', () => {
  test('two guests see each other, emote propagates, ghost hides one', async ({ browser }) => {
    const ctxA = await browser.newContext({ baseURL: WEB_ORIGIN });
    const ctxB = await browser.newContext({ baseURL: WEB_ORIGIN });
    try {
      const pageA = await openOffice(ctxA);
      const pageB = await openOffice(ctxB);

      // Alice joins + publishes a position first, so Bob's join-snapshot sees her.
      await connectPresence(pageA, PRESENCE_WS, { name: 'AliceE2E' });
      await sendPresence(pageA, { type: 'presence.move', x: 100, y: 120, facing: 'down', scene: 'office' });
      await connectPresence(pageB, PRESENCE_WS, { name: 'BobE2E' });
      await sendPresence(pageB, { type: 'presence.move', x: 200, y: 220, facing: 'down', scene: 'office' });

      // --- mutual visibility (Bob via a coalesced peer-updated tick; Alice via
      // Bob's join-snapshot).
      await expect.poll(() => peerNames(pageA), { timeout: 10_000 }).toContain('BobE2E');
      await expect.poll(() => peerNames(pageB), { timeout: 10_000 }).toContain('AliceE2E');

      const aliceId = await selfId(pageA);
      expect(aliceId).not.toBe('');

      // --- emote fan-out: Alice's 🎉 reaches Bob tagged with Alice's peerId.
      await sendPresence(pageA, { type: 'presence.emote', emoji: '🎉' });
      await expect
        .poll(
          async () =>
            (await frames(pageB)).some(
              (f) => f['type'] === 'presence.emote' && f['peerId'] === aliceId && f['emoji'] === '🎉',
            ),
          { timeout: 10_000 },
        )
        .toBe(true);

      // --- chat fan-out (Theme G): Alice's message reaches Bob tagged with her
      // peerId, sanitized (whitespace collapsed) server-side.
      await sendPresence(pageA, { type: 'presence.chat', text: '  hello   Bob  ' });
      await expect
        .poll(
          async () =>
            (await frames(pageB)).some(
              (f) => f['type'] === 'presence.chat' && f['peerId'] === aliceId && f['text'] === 'hello Bob',
            ),
          { timeout: 10_000 },
        )
        .toBe(true);

      // --- ghost retraction (Theme H fix): Alice re-hellos as a ghost while
      // already visible → Bob is told she left, mid-session.
      await sendPresence(pageA, { type: 'presence.hello', name: 'AliceE2E', variant: 0, tint: null, ghost: true });
      await expect
        .poll(
          async () =>
            (await frames(pageB)).some((f) => f['type'] === 'presence.peer-left' && f['peerId'] === aliceId),
          { timeout: 10_000 },
        )
        .toBe(true);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('solo: the office presence HUD mounts and shows only you', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
        sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      } catch {
        // best effort
      }
    });
    await page.goto('/office');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
    // The roster renders you alone — no peers on a fresh, solo session.
    await expect(page.getByText(/In the office · 1/)).toBeVisible();
    await expect(page.getByText('You', { exact: true })).toBeVisible();
  });
});

import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

import { seedTask } from './helpers/gateway';

/**
 * Phase 56 verification — the core guarantee: a board client that briefly drops
 * its WebSocket does NOT silently diverge from gateway truth.
 *
 * Two paths, both driven against the real gateway + WS:
 *
 *  1. **Small gap → resume-replay.** Fewer missed events than the ring holds
 *     (`ws.ringSize: 16` in the e2e fixture). On reconnect the hook sends a
 *     `resume` frame carrying its per-`ch` cursor; the gateway replays the missed
 *     events and the board converges — no manual reload. (Verification bullets:
 *     "No missed-event drift" + "Ordering + dedup".)
 *  2. **Large gap → resync.** More missed events than the ring can retain. The
 *     gateway answers the `resume` with a `resync-required` control frame; the
 *     client full-refetches instead of applying a partial stream, and still
 *     converges on truth. (Verification bullet: "Gap → resync".)
 *
 * Two mechanics make this a faithful test of the real (multi-client) world:
 *
 *  - **Forcing the disconnect.** `context.setOffline` does NOT tear down an
 *    already-open WebSocket in Chromium (it only blocks new HTTP), so the socket
 *    would keep receiving frames and never resume. Instead we wrap
 *    `window.WebSocket` (init script) to close the live `/ws/tasks` socket on
 *    demand and redirect its reconnect attempts to a dead port while "down".
 *  - **A keeper client.** `TasksGateway.broadcast()` short-circuits when there are
 *    zero subscribers — so with a lone client, gap events would never be stamped
 *    into the ring and there'd be nothing to replay/resync. A second board (its
 *    own context, native WebSocket) stays connected throughout, keeping the ring
 *    warm exactly as other clients would in production.
 *
 * Tasks are created server-side (node `fetch`), unaffected by the browser socket
 * state. The **column count badge** (always rendered, independent of Phase 57 F
 * list virtualization) is the convergence signal; the raw WS frames are inspected
 * to prove the resume/resync protocol actually engaged (not just a refetch).
 */

/** Wrap `window.WebSocket` so the test can drop + block the `/ws/tasks` socket. */
async function installWsControl(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    const state = { block: false, open: new Set<WebSocket>() };
    (window as unknown as { __ws: typeof state }).__ws = state;
    function Wrapped(this: unknown, url: string | URL, protocols?: string | string[]) {
      const isTasks = String(url).includes('/ws/tasks');
      // While "down", point reconnect attempts at a refused port so no frames flow.
      const target = isTasks && state.block ? 'ws://127.0.0.1:65123/ws/tasks' : url;
      const ws = protocols === undefined ? new Native(target) : new Native(target, protocols);
      if (isTasks && !state.block) {
        state.open.add(ws);
        ws.addEventListener('close', () => state.open.delete(ws));
      }
      return ws;
    }
    Wrapped.CONNECTING = Native.CONNECTING;
    Wrapped.OPEN = Native.OPEN;
    Wrapped.CLOSING = Native.CLOSING;
    Wrapped.CLOSED = Native.CLOSED;
    Wrapped.prototype = Native.prototype;
    (window as unknown as { WebSocket: unknown }).WebSocket = Wrapped;
  });
}

const dropAndBlock = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as { __ws: { block: boolean; open: Set<WebSocket> } }).__ws;
    s.block = true;
    for (const ws of s.open) ws.close();
  });

const unblock = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { __ws: { block: boolean } }).__ws.block = false;
  });

/** The desktop Todo column's live count badge (its `<h2>`'s following sibling). */
async function todoCount(page: Page): Promise<number> {
  const badge = page
    .getByRole('heading', { name: 'Todo', exact: true })
    .locator('xpath=following-sibling::span[1]');
  return Number.parseInt(((await badge.textContent()) ?? '').trim(), 10);
}

/** A second board in its own context — a real subscriber that keeps the ring warm. */
async function openKeeper(browser: Browser): Promise<() => Promise<void>> {
  const ctx = await browser.newContext();
  const keeper = await ctx.newPage();
  await keeper.goto('/tasks');
  await keeper.getByRole('heading', { name: 'Todo', exact: true }).waitFor();
  return () => ctx.close();
}

test.describe('WS reliability — reconnect resume (Phase 56)', () => {
  test('a brief disconnect replays missed events — the board never silently drifts', async ({
    page,
    browser,
  }) => {
    const closeKeeper = await openKeeper(browser);
    await installWsControl(page);

    const sent: string[] = [];
    const received: string[] = [];
    page.on('websocket', (ws) => {
      if (!ws.url().includes('/ws/tasks')) return;
      ws.on('framesent', (f) => typeof f.payload === 'string' && sent.push(f.payload));
      ws.on('framereceived', (f) => typeof f.payload === 'string' && received.push(f.payload));
    });

    try {
      await page.goto('/tasks');
      await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();
      // Wait until subscribed + anchored (the fresh-subscribe watermark) so the
      // reconnect carries a real cursor.
      await expect.poll(() => received.some((p) => p.includes('"type":"watermark"'))).toBe(true);
      const before = await todoCount(page);

      // Cut the socket + block reconnects, publish a small burst (< ring), restore.
      await dropAndBlock(page);
      const GAP = 3;
      for (let i = 0; i < GAP; i += 1) await seedTask(`E2E resume — gap ${i}`, 'todo');
      await unblock(page);

      // The board converges to gateway truth with no manual reload…
      await expect.poll(async () => await todoCount(page), { timeout: 20_000 }).toBe(before + GAP);
      // …and it got there via the resume protocol (a reconnect carried the cursor),
      // not a cold re-subscribe.
      expect(sent.some((p) => p.includes('"type":"resume"'))).toBe(true);
    } finally {
      await closeKeeper();
    }
  });

  test('a gap larger than the ring forces a full resync (never a partial stream)', async ({
    page,
    browser,
  }) => {
    const closeKeeper = await openKeeper(browser);
    await installWsControl(page);

    const received: string[] = [];
    page.on('websocket', (ws) => {
      if (!ws.url().includes('/ws/tasks')) return;
      ws.on('framereceived', (f) => typeof f.payload === 'string' && received.push(f.payload));
    });

    try {
      await page.goto('/tasks');
      await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();
      await expect.poll(() => received.some((p) => p.includes('"type":"watermark"'))).toBe(true);
      const before = await todoCount(page);

      // Overflow the ring (fixture `ws.ringSize: 16`) while down so the gateway
      // can't replay the whole gap.
      await dropAndBlock(page);
      const GAP = 20;
      for (let i = 0; i < GAP; i += 1) await seedTask(`E2E resync — gap ${i}`, 'todo');
      await unblock(page);

      // Board still converges on truth (via a full refetch)…
      await expect.poll(async () => await todoCount(page), { timeout: 20_000 }).toBe(before + GAP);
      // …because the gateway told the client to resync rather than stream a partial
      // (drift-prone) replay.
      expect(received.some((p) => p.includes('"type":"resync-required"'))).toBe(true);
    } finally {
      await closeKeeper();
    }
  });
});

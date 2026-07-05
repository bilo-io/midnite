import { expect, test } from '@playwright/test';

import { seedTask } from './helpers/gateway';

/**
 * Phase 57 E — refetch/cache tuning. The board must not reload once per event.
 *
 * Before: every task WebSocket event called `invalidateData()` → an immediate
 * `invalidateQueries()` → a full `GET /tasks` refetch, so a burst of N events
 * cost N board reloads (the "refetch storm"). After: `invalidateData()` is
 * debounced (leading + trailing over ~300ms), so a burst coalesces into a
 * small, bounded number of refetches.
 *
 * We assert against the real gateway + WS: count `GET /tasks` (the board list)
 * the browser makes, fire a concurrent burst of `POST /tasks` (each broadcasts a
 * `task.created` frame to the mounted board), and check the burst produced far
 * fewer refetches than events.
 */
test.describe('Refetch coalescing (Phase 57 E)', () => {
  test('a burst of task events triggers far fewer than N board refetches', async ({ page }) => {
    // Count only board-list refetches: a GET on the exact `/tasks` collection
    // path — not the POST creates, and not `GET /tasks/:id` or `/tasks/counts`.
    let listRefetches = 0;
    page.on('request', (req) => {
      if (req.method() !== 'GET') return;
      try {
        if (new URL(req.url()).pathname.endsWith('/tasks')) listRefetches += 1;
      } catch {
        /* ignore non-URL request targets */
      }
    });

    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();

    // Warm-up: prove the live WS pipeline actually reaches this board (a created
    // task shows up without a manual reload) before we measure coalescing.
    const warmup = await seedTask('E2E coalesce — warmup', 'todo');
    await expect(page.getByText(warmup.title)).toBeVisible();
    await page.waitForLoadState('networkidle');

    const before = listRefetches;
    const BURST = 8;

    // Fire the burst concurrently so the `task.created` frames land inside one
    // debounce window. Seeded server-side (node fetch), so these POSTs are not
    // browser requests and never inflate the GET counter.
    await Promise.all(
      Array.from({ length: BURST }, (_, i) => seedTask(`E2E coalesce — burst ${i}`, 'todo')),
    );

    // Let the debounce window close (300ms) and any coalesced refetch settle.
    await page.waitForTimeout(1_200);
    await page.waitForLoadState('networkidle');

    const burstRefetches = listRefetches - before;

    // The WS did drive a refresh (board isn't silently stale)…
    expect(burstRefetches).toBeGreaterThan(0);
    // …but the burst coalesced — nowhere near one refetch per event…
    expect(burstRefetches).toBeLessThan(BURST);
    // …and in practice just the leading + trailing edge (+1 slack for a frame
    // that arrives right as a window closes).
    expect(burstRefetches).toBeLessThanOrEqual(3);

    // And the coalesced refetch still converged on gateway truth: the last
    // burst task is on the board.
    await expect(page.getByText(`E2E coalesce — burst ${BURST - 1}`)).toBeVisible();
  });
});

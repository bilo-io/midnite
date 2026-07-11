import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { GATEWAY_ORIGIN, SCREENSHOTS_DIR } from './config';

/**
 * Phase 62 G — preview shot + functional coverage of the Digests feed. The
 * digest data path is covered by shared/gateway/RTL unit tests; here we
 * route-mock `GET /digests` (list) + `GET /digests/:id` (detail) with a rich
 * fixture so the two-pane master-detail render is stable, and assert the feed
 * selects the newest digest, renders its structured detail, and deep-links a
 * highlight to its task.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
const DESKTOP = { width: 1440, height: 900 };

const LIST = [
  {
    id: 'dg-1',
    createdAt: '2026-07-10T08:00:00.000Z',
    from: '2026-07-09T00:00:00.000Z',
    to: '2026-07-10T00:00:00.000Z',
    headline: 'Nine shipped, two abandoned — steady progress across the fleet',
    counts: { shipped: 9, failed: 2, needsAttention: 1 },
  },
  {
    id: 'dg-2',
    createdAt: '2026-07-09T08:00:00.000Z',
    from: '2026-07-08T00:00:00.000Z',
    to: '2026-07-09T00:00:00.000Z',
    headline: 'A quiet day — three landed cleanly',
    counts: { shipped: 3, failed: 0, needsAttention: 0 },
  },
];

const DETAIL = {
  ...LIST[0],
  sections: [
    { name: 'bilo-io/midnite', shipped: 6, failed: 1 },
    { name: 'acme/api', shipped: 3, failed: 1 },
  ],
  highlights: [
    { taskId: 't-100', title: 'Ship the digests feed', outcome: 'done', note: 'Two-pane master-detail with deep-links.' },
    { taskId: 't-101', title: 'Flaky reconnect test', outcome: 'abandoned', note: 'Retries exhausted; needs a human.' },
  ],
  spend: { totalUsd: 12.4, measuredUsd: 11.1, sessions: 18 },
  cycle: { tasks: 11, p50Ms: 1_800_000, p90Ms: 7_200_000 },
  markdown: '# Fleet digest\n\nNine shipped, two abandoned.',
};

test.use({ colorScheme: 'dark', viewport: DESKTOP });

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem('midnite.theme', 'dark');
    } catch {
      /* best effort */
    }
  });
  // Scope mocks to the GATEWAY origin only — `/digests` is also a web route, so a
  // bare `**/digests` glob would intercept the page navigation itself and render
  // the JSON as the document. Detail is registered after list so the more-specific
  // `/digests/dg-*` (last-registered) wins for a detail request.
  await page.route(`${GATEWAY_ORIGIN}/digests?*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ digests: LIST }) }),
  );
  await page.route(`${GATEWAY_ORIGIN}/digests`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ digests: LIST }) }),
  );
  await page.route(`${GATEWAY_ORIGIN}/digests/dg-*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ digest: DETAIL }) }),
  );
});

test('Digests feed → master-detail', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/digests');

  // The feed lists both digests and auto-selects the newest into the detail pane.
  await expect(page.getByRole('heading', { name: /Nine shipped, two abandoned/ })).toBeVisible();
  await expect(page.getByText('A quiet day — three landed cleanly')).toBeVisible();
  await expect(page.getByText('Highlights')).toBeVisible();

  // A highlight deep-links to its task (Next `output: 'export'` adds a trailing
  // slash before the query, so the rendered href is `/tasks/?task=…`).
  await expect(page.getByRole('link', { name: /Ship the digests feed/ })).toHaveAttribute(
    'href',
    '/tasks/?task=t-100',
  );

  await page.screenshot({ path: join(OUT, 'digests-feed.png'), fullPage: true });
});

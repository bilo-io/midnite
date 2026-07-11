import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { test, type Page } from '@playwright/test';

import { SCREENSHOTS_DIR, GATEWAY_ORIGIN } from './config';

/**
 * Phase 62 Theme G — the digests feed. Route-mocks the `/digests` read API (a
 * digest only exists after a digest workflow runs, so there's nothing to seed via
 * the gateway helpers) so the populated feed + expanded detail render as evidence.
 */

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

const SUMMARIES = [
  { id: 'dg-1111', createdAt: '2026-07-11T08:00:00.000Z', from: '2026-07-10T00:00:00.000Z', to: '2026-07-11T00:00:00.000Z', counts: { shipped: 7, failed: 2, needsAttention: 1 }, headline: 'Seven shipped — the OAuth refactor landed; two flaky tasks abandoned' },
  { id: 'dg-2222', createdAt: '2026-07-10T08:00:00.000Z', from: '2026-07-09T00:00:00.000Z', to: '2026-07-10T00:00:00.000Z', counts: { shipped: 4, failed: 0, needsAttention: 0 }, headline: 'Quiet, clean day — four shipped, nothing failed' },
  { id: 'dg-3333', createdAt: '2026-07-09T08:00:00.000Z', from: '2026-07-08T00:00:00.000Z', to: '2026-07-09T00:00:00.000Z', counts: { shipped: 5, failed: 3, needsAttention: 2 }, headline: 'Rough one — three gate failures need a human look' },
];

const FULL = {
  ...SUMMARIES[0],
  sections: [
    { name: 'midnite', shipped: 5, failed: 1 },
    { name: 'infra', shipped: 2, failed: 1 },
  ],
  highlights: [
    { taskId: 't-a', title: 'Refactor the OAuth token flow', outcome: 'done', note: 'shipped after two retries' },
    { taskId: 't-b', title: 'Flaky presence e2e', outcome: 'abandoned', note: 'retries exhausted' },
  ],
  spend: { totalUsd: 4.17, measuredUsd: 4.17, sessions: 9 },
  cycle: { tasks: 7, p50Ms: 5_400_000, p90Ms: 18_000_000 },
  markdown: '# Fleet digest\n\n**7 shipped**, 2 failed, 1 needs attention.\n\n## By repo\n\n- **midnite** — 5 shipped, 1 failed\n- **infra** — 2 shipped, 1 failed\n\n## Highlights\n\n- Refactor the OAuth token flow — shipped after two retries.\n- Flaky presence e2e — retries exhausted, abandoned.',
};

async function mockDigests(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      localStorage.setItem('midnite.theme', 'dark');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      /* best effort */
    }
  });
  await page.route(`${GATEWAY_ORIGIN}/digests**`, (route) => {
    const url = new URL(route.request().url());
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (url.pathname.endsWith('/export')) {
      return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'text/markdown' }, body: FULL.markdown });
    }
    if (/\/digests\/[^/]+$/.test(url.pathname)) {
      return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ digest: FULL }) });
    }
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ digests: SUMMARIES }) });
  });
}

test('digests feed', async ({ page }) => {
  await mockDigests(page);
  await page.goto('/digests');
  await page.getByText('Seven shipped', { exact: false }).waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, 'digests-feed.png'), fullPage: true });
});

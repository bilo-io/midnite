import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 61 G — preview shots of the deepened Ops page: the cycle-time
 * (wait/work/end-to-end p50/p90) bars and the fleet-trend charts (queue depth /
 * slots / tick latency). A fresh e2e gateway has no completed tasks or gauge
 * samples, so the two new endpoints are route-mocked with representative data —
 * the deterministic chart render is what we capture. (The data path is covered
 * by shared, gateway, and RTL unit tests.)
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
const DESKTOP = { width: 1440, height: 900 };

const h = (n: number) => n * 3_600_000;
const CYCLE = {
  from: '2026-06-07T00:00:00.000Z',
  to: '2026-07-07T00:00:00.000Z',
  groupBy: 'none',
  groups: [
    {
      key: 'all',
      taskCount: 42,
      wait: { p50Ms: h(0.5), p90Ms: h(2), count: 42 },
      work: { p50Ms: h(1.5), p90Ms: h(4), count: 41 },
      endToEnd: { p50Ms: h(2), p90Ms: h(6), count: 42 },
      retryOverheadMsTotal: 12 * 60_000,
      tasksWithRetries: 3,
    },
  ],
};

function gaugeSamples() {
  const base = Date.parse('2026-07-07T00:00:00.000Z');
  const samples = [];
  for (let i = 0; i < 24; i++) {
    const at = new Date(base + i * 3_600_000).toISOString();
    samples.push({
      at,
      queueDepth: Math.round(3 + 3 * Math.sin(i / 3)),
      slotsUsed: Math.min(4, Math.max(0, Math.round(2 + 2 * Math.sin(i / 2)))),
      slotsTotal: 4,
      tickLatencyMs: Math.round(8 + 6 * Math.sin(i / 4) + (i % 3)),
    });
  }
  return { samples, truncated: false };
}

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
});

test('Ops → cycle-time + fleet-trend charts', async ({ page }) => {
  await page.route('**/metrics/cycle-time**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CYCLE) }),
  );
  await page.route('**/metrics/gauges/history**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(gaugeSamples()),
    }),
  );

  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/ops');

  const cycle = page
    .locator('div.rounded-xl.border.bg-card')
    .filter({ has: page.getByRole('heading', { name: 'Cycle time (wait vs. work)' }) });
  const fleet = page
    .locator('div.rounded-xl.border.bg-card')
    .filter({ has: page.getByRole('heading', { name: 'Fleet trends' }) });

  await expect(cycle).toBeVisible();
  await expect(fleet).toBeVisible();
  await expect(cycle.getByText(/completed tasks in window/i)).toBeVisible();

  await cycle.scrollIntoViewIfNeeded();
  await cycle.screenshot({ path: join(OUT, 'ops-cycle-time.png') });
  await fleet.scrollIntoViewIfNeeded();
  await fleet.screenshot({ path: join(OUT, 'ops-fleet-trends.png') });
});

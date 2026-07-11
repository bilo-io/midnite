import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 61 G — preview shots + functional coverage of the Ops cost views: a
 * cost-over-time stack (gateway-LLM vs. measured/estimated session cost, from
 * `/metrics/rollups`) and a cost-by-dimension breakdown (repo/project/provider,
 * from `/usage/attribution` + rollups). A fresh e2e gateway has no rolled-up
 * cost, so both endpoints are route-mocked with representative data — the
 * deterministic chart render + the group-by toggle are what we capture. (The
 * data path is covered by shared, gateway, and RTL unit tests.)
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
const DESKTOP = { width: 1440, height: 900 };

type RollupRow = {
  key: string;
  period: 'daily';
  bucketStart: string;
  source: 'llm' | 'session' | 'runs' | 'gauge';
  repo: string | null;
  provider: string | null;
  model: string | null;
  estCostUsd: number | null;
  runCount: number | null;
  doneCount: number | null;
  abandonedCount: number | null;
  failedCount: number | null;
  cancelledCount: number | null;
  totalDurationMs: number | null;
  retriedRuns: number | null;
  calls: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  avgQueueDepth: number | null;
  avgSlotsUsed: number | null;
  avgTickLatencyMs: number | null;
  sampleCount: number | null;
};

function row(partial: Partial<RollupRow> & Pick<RollupRow, 'source'>): RollupRow {
  return {
    key: 'k',
    period: 'daily',
    bucketStart: '2026-07-01T00:00:00.000Z',
    repo: null,
    provider: null,
    model: null,
    estCostUsd: null,
    runCount: null,
    doneCount: null,
    abandonedCount: null,
    failedCount: null,
    cancelledCount: null,
    totalDurationMs: null,
    retriedRuns: null,
    calls: null,
    inputTokens: null,
    outputTokens: null,
    avgQueueDepth: null,
    avgSlotsUsed: null,
    avgTickLatencyMs: null,
    sampleCount: null,
    ...partial,
  };
}

function rollups() {
  const base = Date.parse('2026-06-24T00:00:00.000Z');
  const rows: RollupRow[] = [];
  for (let i = 0; i < 14; i++) {
    const bucketStart = new Date(base + i * 86_400_000).toISOString();
    const key = `daily|${bucketStart}`;
    rows.push(
      row({
        key: `${key}|llm|anthropic`,
        bucketStart,
        source: 'llm',
        provider: 'anthropic',
        estCostUsd: 0.4 + 0.3 * Math.abs(Math.sin(i / 2)),
      }),
      row({
        key: `${key}|session|anthropic`,
        bucketStart,
        source: 'session',
        provider: 'anthropic',
        repo: 'midnite',
        estCostUsd: 0.9 + 0.6 * Math.abs(Math.sin(i / 3)),
      }),
      row({
        key: `${key}|session|openai`,
        bucketStart,
        source: 'session',
        provider: 'openai',
        repo: 'web',
        estCostUsd: 0.3 + 0.2 * Math.abs(Math.cos(i / 3)),
      }),
    );
  }
  return { period: 'daily', from: rows[0]!.bucketStart, to: rows.at(-1)!.bucketStart, rows };
}

function attributionByRepo() {
  const mk = (key: string, label: string, measured: number, unpriced = 0) => ({
    key,
    label,
    sessions: 4,
    inputTokens: 120_000,
    outputTokens: 40_000,
    cachedTokens: 80_000,
    estCostUsd: measured,
    measuredCostUsd: measured,
    estimatedCostUsd: 0,
    unpricedSessions: unpriced,
  });
  const buckets = [
    mk('midnite', 'midnite', 12.4),
    mk('web', 'web', 6.1),
    mk('gateway', 'gateway', 3.8, 2),
    mk('docs', 'docs', 1.2),
  ];
  return {
    from: '2026-06-24T00:00:00.000Z',
    to: '2026-07-07T00:00:00.000Z',
    groupBy: 'repo',
    totals: {
      sessions: 16,
      inputTokens: 480_000,
      outputTokens: 160_000,
      cachedTokens: 320_000,
      estCostUsd: 23.5,
      measuredCostUsd: 23.5,
      estimatedCostUsd: 0,
      unpricedSessions: 2,
    },
    buckets,
  };
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

test('Ops → cost over time + cost by dimension', async ({ page }) => {
  await page.route('**/metrics/rollups**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rollups()) }),
  );
  await page.route('**/usage/attribution**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(attributionByRepo()),
    }),
  );

  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/ops');

  const trend = page
    .locator('div.rounded-xl.border.bg-card')
    .filter({ has: page.getByRole('heading', { name: 'Cost over time' }) });
  const breakdown = page
    .locator('div.rounded-xl.border.bg-card')
    .filter({ has: page.getByRole('heading', { name: 'Cost by dimension' }) });

  await expect(trend).toBeVisible();
  await expect(breakdown).toBeVisible();
  // Honesty legend renders all three cost classes.
  await expect(trend.getByText('Session (measured)')).toBeVisible();
  await expect(trend.getByText('Session (estimated)')).toBeVisible();
  // Unpriced sessions surfaced from attribution.
  await expect(breakdown.getByText(/unpriced session/i)).toBeVisible();

  await trend.scrollIntoViewIfNeeded();
  await trend.screenshot({ path: join(OUT, 'ops-cost-trend.png') });
  await breakdown.scrollIntoViewIfNeeded();
  await breakdown.screenshot({ path: join(OUT, 'ops-cost-breakdown.png') });

  // Group-by toggle → provider view derives bars from rollup cost.
  await breakdown.getByRole('combobox', { name: /group cost by/i }).selectOption('provider');
  await expect(breakdown.getByText('Measured')).toBeVisible();
  await breakdown.screenshot({ path: join(OUT, 'ops-cost-by-provider.png') });
});

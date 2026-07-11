import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { GATEWAY_ORIGIN, SCREENSHOTS_DIR } from './config';
import { seedTask } from './helpers/gateway';

/**
 * Phase 60 Theme H — consistency & flow sweep. Capture-only (no pixel baselines):
 * each doc-listed surface in its **empty** and **error** states, so the audit
 * report can cite what a user actually sees when a view has no data or its
 * primary fetch fails. Not a regression gate — evidence for the findings report.
 *
 * Empty = fresh e2e gateway (agent pool off, no seed for that domain).
 * Error  = `page.route` fulfils the surface's primary GET with a 500 before nav.
 * Loading = a delayed route on one representative surface (board) to catch the
 *           skeleton/spinner deterministically.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      localStorage.setItem('midnite.theme', 'dark');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      /* best effort */
    }
  });
});

async function shoot(page: Page, name: string): Promise<void> {
  // Give the view a beat to settle its empty/error render past any skeleton.
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, `h-${name}.png`), fullPage: true });
}

/** Fulfil every matching request with a 500 so the surface hits its error path. */
async function break500(page: Page, glob: string): Promise<void> {
  await page.route(glob, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ statusCode: 500, message: 'Internal Server Error' }) }),
  );
}

// The doc-listed surfaces + the primary gateway GET that drives each one.
const SURFACES: { name: string; path: string; api: string }[] = [
  { name: 'board', path: '/tasks', api: `${GATEWAY_ORIGIN}/tasks**` },
  { name: 'sessions', path: '/sessions', api: `${GATEWAY_ORIGIN}/sessions**` },
  { name: 'projects', path: '/projects', api: `${GATEWAY_ORIGIN}/projects**` },
  { name: 'workflows', path: '/workflows', api: `${GATEWAY_ORIGIN}/workflows**` },
  { name: 'slides', path: '/slides', api: `${GATEWAY_ORIGIN}/slides**` },
  { name: 'search', path: '/search?q=zzz', api: `${GATEWAY_ORIGIN}/search**` },
  { name: 'settings', path: '/settings', api: `${GATEWAY_ORIGIN}/config**` },
];

for (const s of SURFACES) {
  test(`empty: ${s.name}`, async ({ page }) => {
    await page.goto(s.path);
    await shoot(page, `${s.name}-empty`);
  });

  test(`error: ${s.name}`, async ({ page }) => {
    await break500(page, s.api);
    await page.goto(s.path);
    await shoot(page, `${s.name}-error`);
  });
}

// Populated board (seeded) + a loading capture via a delayed /tasks response.
test('populated + loading: board', async ({ page }) => {
  await seedTask('Wire up the settings drawer', 'todo');
  await seedTask('Draft the release notes', 'waiting');
  await seedTask('Ship the search index backfill', 'done');

  // Loading: hold /tasks for 2.5s so the skeleton is on screen when we shoot.
  await page.route(`${GATEWAY_ORIGIN}/tasks**`, async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await page.goto('/tasks');
  await page.waitForTimeout(600); // mid-load → skeleton/spinner visible
  await page.screenshot({ path: join(OUT, 'h-board-loading.png'), fullPage: true });

  await expect(page.getByText('Wire up the settings drawer')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: join(OUT, 'h-board-populated.png'), fullPage: true });
});

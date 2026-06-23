import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedTask } from './helpers/gateway';

/**
 * Phase 22 Theme D — capture the new "Awaiting review / Awaiting merge" delivery
 * filter pills on the tasks board, in their default and toggled-active states.
 * (The pills always render; the prStatus-driven filtering itself is covered by
 * lib/pr-delivery unit tests — the e2e gateway can't resolve a live GitHub PR.)
 */

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  await Promise.all([
    seedTask('Delivery filter — todo item', 'todo'),
    seedTask('Delivery filter — in progress item', 'wip'),
    seedTask('Delivery filter — shipped item', 'done'),
  ]);
});

test.use({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } });

test('delivery filter pills — default and active', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Awaiting review' }).waitFor();

  const controls = page.locator('.reveal-controls');
  await controls.screenshot({ path: join(OUT, 'delivery-filter-default.png') });

  await page.getByRole('button', { name: 'Awaiting merge' }).click();
  await controls.screenshot({ path: join(OUT, 'delivery-filter-active.png') });
});

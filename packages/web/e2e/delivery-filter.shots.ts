import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedTask } from './helpers/gateway';

/**
 * Phase 22 Theme D — capture the "Awaiting review / Awaiting merge" delivery
 * filter (a dropdown on the tasks board), in its default and toggled-active
 * states. (The control always renders; the prStatus-driven filtering itself is
 * covered by lib/pr-delivery unit tests — the e2e gateway can't resolve a live
 * GitHub PR.)
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

test('delivery filter — default and active', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Delivery' }).waitFor();

  const controls = page.locator('.reveal-controls');
  await controls.screenshot({ path: join(OUT, 'delivery-filter-default.png') });

  // Open the dropdown, toggle a delivery state on, then close the menu so the
  // shot captures the trigger's active state.
  await page.getByRole('button', { name: 'Delivery' }).click();
  await page.getByRole('option', { name: 'Awaiting merge' }).click();
  await page.keyboard.press('Escape');
  await controls.screenshot({ path: join(OUT, 'delivery-filter-active.png') });
});

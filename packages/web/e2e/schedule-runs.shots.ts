import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 45 D — capture the run-history disclosure and the "New from preset" menu
 * on the Schedules view. Creates a schedule via the UI, runs it once (so there's a
 * run with a created task to link to), then expands its history.
 */

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.use({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } });

test('schedules — preset menu + run history', async ({ page }) => {
  // A fresh e2e gateway auto-opens the setup wizard — suppress it (same keys the
  // other shots specs use) so it doesn't overlay the view we're capturing.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      // ignore storage failures
    }
  });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/schedules');
  await page.getByText('No schedules yet').waitFor();

  // The "New from preset" menu (Daily standup system template is seeded).
  await page.getByRole('button', { name: 'New from preset' }).click();
  await page.getByRole('menu', { name: 'Schedule presets' }).waitFor();
  await page.screenshot({ path: join(OUT, 'schedules-preset-menu.png') });

  // Install the standup preset, then run it once so it has a run with a task.
  await page.getByRole('menuitem', { name: /Daily standup/ }).click();
  await page.getByText('Daily standup').first().waitFor();
  await page.getByRole('button', { name: 'Run now' }).click();
  // Give the run a beat to create its task, then open the history.
  await page.getByRole('button', { name: 'History' }).click();
  await page.getByRole('list', { name: 'Run history' }).waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, 'schedules-run-history.png') });
});

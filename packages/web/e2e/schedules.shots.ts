import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 45 C — capture the Schedules facade: the empty state, the create dialog
 * (recurrence preset + task prompt), and the populated list after creating a
 * weekday standup. The schedule is created through the UI (no workflow seeder
 * exists), which doubles as a smoke test of the create → list flow.
 */

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.use({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } });

test('schedules facade — empty, dialog, populated', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/schedules');
  await page.getByText('No schedules yet').waitFor();
  await page.screenshot({ path: join(OUT, 'schedules-empty.png') });

  // Open the create dialog (header button) and fill it in.
  await page.getByRole('button', { name: 'New schedule' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New schedule' });
  await dialog.waitFor();
  await dialog.getByLabel('Name').fill('Daily standup');
  await dialog.getByLabel('Recurrence').selectOption('weekdays');
  await dialog.getByLabel('Task prompt').fill('Post the daily standup summary for the team.');
  await dialog.screenshot({ path: join(OUT, 'schedules-create-dialog.png') });

  await dialog.getByRole('button', { name: 'Create schedule' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByText('Daily standup').waitFor();
  await page.getByText(/Weekdays at/).waitFor();
  await page.screenshot({ path: join(OUT, 'schedules-populated.png') });
});

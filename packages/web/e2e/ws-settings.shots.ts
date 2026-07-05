import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

// Phase 56 A — preview shot of the new Settings → System → Realtime control
// (the runtime event-buffer size select). Not a baseline assertion.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      /* best effort */
    }
  });
});

test('settings — realtime event-buffer control', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/settings/system');
  await page.getByRole('button', { name: /Realtime/i }).click();
  await expect(page.getByLabel('Event buffer size')).toBeVisible();
  await page.getByLabel('Event buffer size').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(OUT, 'ws-settings-realtime.png') });
});

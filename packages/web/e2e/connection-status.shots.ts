import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

// Phase 56 E — preview shot of the live-connection indicator in the sidebar
// footer (against the real e2e gateway, so the socket connects → "live").
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

test('sidebar shows the live-connection indicator', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/tasks');
  // The indicator settles to "live" once the board socket connects.
  await expect(page.getByRole('status', { name: /Connection: Live/i })).toBeVisible();
  await page.screenshot({ path: join(OUT, 'connection-status-live.png') });
});

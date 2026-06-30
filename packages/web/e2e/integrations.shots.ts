import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 44 Theme A — preview shots of the new Settings → Integrations page
 * (outbound webhooks). A fresh e2e gateway runs JWT-disabled, so the page lists
 * the (empty) null-team endpoints — enough to show the empty state and the
 * add-endpoint modal (provider / events / status filter).
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
const DESKTOP = { width: 1440, height: 900 };

test.use({ colorScheme: 'dark', viewport: DESKTOP });

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

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

test('Integrations page — empty state and add-endpoint modal', async ({ page }) => {
  await page.goto('/settings/integrations');
  await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible();
  await expect(page.getByText(/No webhook endpoints yet/)).toBeVisible();
  await page.screenshot({ path: join(OUT, 'integrations-empty.png') });

  await page.getByRole('button', { name: 'Add endpoint' }).click();
  await expect(page.getByText('Add webhook endpoint')).toBeVisible();
  await page.screenshot({ path: join(OUT, 'integrations-create-modal.png') });
});

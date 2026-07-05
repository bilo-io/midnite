import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 54 F — preview shot of the Runtime health panel on the Ops page. A fresh
 * e2e gateway boots with no MIDNITE_SECRET_KEY / repos, so preflight shows a mix
 * of ok + warn checks — exactly the diagnostic surface this panel is for.
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
      localStorage.setItem('midnite.theme', 'dark');
    } catch {
      /* best effort */
    }
  });
});

test('Ops → Runtime health panel', async ({ page }) => {
  await page.goto('/ops');
  // The whole card: the rounded border/card div that contains the heading.
  const panel = page
    .locator('div.rounded-xl.border.bg-card')
    .filter({ has: page.getByRole('heading', { name: 'Runtime health' }) });
  await expect(panel).toBeVisible();
  // Wait for the live checks to populate (a preflight row) before capturing.
  await expect(panel.getByText('config').first()).toBeVisible();
  await panel.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: join(OUT, 'runtime-health-panel.png') });
});

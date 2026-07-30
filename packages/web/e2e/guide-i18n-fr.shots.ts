import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme D (guide slice) — the board guide launched from the assistant's
 * all-guides index under fr-FR, proving the `guide` namespace resolves end-to-end
 * (index label, step title/body, overlay chrome + ICU step counter). Preview PNG
 * only (no baseline) — the full fr-FR walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test('board guide first step — fr-FR', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.theme', 'dark');
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem(
        'midnite.settings',
        JSON.stringify({ locale: 'fr-FR', inactivityTimeoutS: 86_400, autoShowGuides: false }),
      );
    } catch {
      // storage unavailable — the default locale is the fallback
    }
  });
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/tasks');
  const fab = page.getByRole('button', { name: 'Open assistant' });
  await fab.waitFor({ state: 'visible' });
  await fab.click();
  await page.getByRole('button', { name: /Guides/i }).click();

  // The index shows the localised label; launch the board guide by it.
  await page
    .getByRole('button')
    .filter({ has: page.getByText('Visite du tableau', { exact: true }) })
    .first()
    .click();

  // French overlay chrome proves the catalog resolves end-to-end.
  await page.getByRole('button', { name: 'Passer' }).waitFor({ state: 'visible' });
  await page.getByText('Votre tableau').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/guide-board-fr.png` });
});

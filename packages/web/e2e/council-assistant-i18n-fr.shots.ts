import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme D (council + assistant slice) — the councils page and the
 * assistant panel under fr-FR, proving the two new namespaces resolve end-to-end
 * (page header, empty state, toolbar, and the assistant menu's five entries). The
 * locale rides the Phase 43 settings blob the pre-paint init script resolves.
 * Preview PNGs only (no baselines) — the full fr-FR walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.theme', 'dark');
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem(
        'midnite.settings',
        JSON.stringify({ locale: 'fr-FR', inactivityTimeoutS: 86_400 }),
      );
    } catch {
      // storage unavailable — the default locale is the fallback
    }
  });
  await page.emulateMedia({ colorScheme: 'dark' });
});

test('councils page + assistant panel — fr-FR', async ({ page }) => {
  await page.goto('/councils');
  // The French page heading doubles as the loaded signal.
  await expect(page.getByRole('heading', { name: 'Conseils', exact: true })).toBeVisible();
  await expect(page.getByText('Aucun conseil pour l’instant')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/councils-fr.png` });

  // The assistant FAB is mounted on every app route; its French aria-label proves
  // the `assistant` namespace reached the shell-level surface too.
  await page.getByRole('button', { name: 'Ouvrir l’assistant' }).click();
  await expect(page.getByRole('dialog', { name: 'Assistant' })).toBeVisible();
  await expect(page.getByText('Signaler un problème')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/assistant-panel-fr.png` });
});

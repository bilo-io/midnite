import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme B — the board + new-task dialog rendered under fr-FR, proving
 * the migrated board/tasks surfaces read the French catalog end-to-end (columns,
 * toolbar, card chips, dialog copy). The locale rides the Phase 43 settings blob
 * the pre-paint init script resolves. Preview PNGs only (no baselines) — the
 * full-surface fr-FR walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test('board + new-task dialog — fr-FR', async ({ page }) => {
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

  await page.goto('/tasks');
  // The French board title ("Tableau des tâches") doubles as the loaded signal.
  await page.getByRole('group', { name: 'Tableau des tâches' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/board-fr.png` });

  await page.getByRole('button', { name: 'Nouvelle tâche' }).click();
  await page.getByRole('dialog', { name: 'Nouvelle tâche' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/board-fr-new-task.png` });
});

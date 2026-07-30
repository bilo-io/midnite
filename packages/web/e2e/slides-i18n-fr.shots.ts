import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme D (roadmap/slides/safety slice) — the slides list under fr-FR,
 * proving the new `slides` namespace resolves end-to-end (page header, toolbar,
 * empty state / deck cards). The locale rides the Phase 43 settings blob the
 * pre-paint init script resolves. Preview PNG only (no baseline) — the full
 * fr-FR walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test('slides list — fr-FR', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.theme', 'dark');
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem(
        'midnite.settings',
        JSON.stringify({ locale: 'fr-FR', inactivityTimeoutS: 86_400 }),
      );
      // Seed one deck so the list view (toolbar + card) renders, not just the empty state.
      localStorage.setItem(
        'midnite.slides.decks',
        JSON.stringify([
          {
            id: 'd1',
            title: 'Revue trimestrielle',
            markdown: '# Revue trimestrielle\n\n## Chiffres\n\n- en hausse',
            createdAt: '2026-07-01T09:00:00.000Z',
            updatedAt: '2026-07-15T09:00:00.000Z',
          },
        ]),
      );
    } catch {
      // storage unavailable — the default locale is the fallback
    }
  });
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/slides');
  // The French "new deck" toolbar link doubles as the loaded signal.
  await page.getByRole('link', { name: 'Nouveau diaporama' }).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/slides-fr.png` });
});

import { resolve } from 'node:path';

import { test, type Page } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedTask } from './helpers/gateway';

/**
 * Phase 82 Theme D (sessions / media / digests residue) — the Sessions list, the
 * Media library and the Digests feed rendered under fr-FR, proving the three new
 * namespaces read end-to-end: the status filter pills and their section groups, the
 * view-toggle aria labels, the media sidebar + type tabs, and the digests empty
 * state. The locale rides the Phase 43 settings blob the pre-paint init resolves.
 * Preview PNGs only (no baselines) — the full-surface walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

/** Dark theme + fr-FR + the wizard/nudge silenced, before first paint. */
function seedLocale(page: Page) {
  return page.addInitScript(() => {
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
}

test('sessions list — fr-FR', async ({ page }) => {
  // A task creates the session row the list renders.
  await seedTask(`Session i18n ${Date.now()}`);
  await seedLocale(page);
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/sessions');
  // The French status filter pill doubles as the hydrated signal.
  await page.getByText('Tous les statuts', { exact: true }).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/sessions-fr.png`, fullPage: true });
});

test('media library — fr-FR', async ({ page }) => {
  await seedLocale(page);
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/media');
  // The sidebar heading + the localised type tabs.
  await page.getByRole('button', { name: 'Nouveau média' }).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/media-fr.png`, fullPage: true });

  // The type picker: each option's label + blurb resolve through the enum hook.
  await page.getByRole('button', { name: 'Nouveau média' }).first().click();
  await page.getByRole('dialog', { name: 'Choisir un type de média' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/media-fr-type-picker.png` });
});

test('digests feed — fr-FR', async ({ page }) => {
  await seedLocale(page);
  await page.emulateMedia({ colorScheme: 'dark' });

  // The feed lives on the Digest tab of /ops (the /digests route redirects here).
  await page.goto('/ops?tab=digest');
  // A seeded gateway has no digests, so this is the (French) empty state — shown
  // honestly rather than cropped out.
  await page.getByText('Aucun digest', { exact: true }).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/digests-fr.png`, fullPage: true });
});

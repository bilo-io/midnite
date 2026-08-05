import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme D (composer / editors / pickers slice) — the two surfaces where this
 * slice's copy only exists at real widths, under fr-FR.
 *
 * What a unit test can't show: the dashboard composer is a *docked* control whose
 * placeholder, task counter (`{count, plural, …}`) and the icon-button tooltips all
 * compete for one row — French runs longer than English everywhere here, so the shot is
 * the layout assertion. The folder picker is a modal over a settings page whose own copy
 * is already French, which makes any English straggler in the dialog obvious side by side.
 *
 * Preview PNGs only (no baselines) — the full-surface fr-FR walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

function seedFrench(): void {
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
}

test('dashboard prompt composer — fr-FR', async ({ page }) => {
  await page.addInitScript(seedFrench);
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/dashboard');
  // The composer's placeholder doubles as the hydrated signal — and is itself the
  // longest string in the slice, so it is what the layout has to survive.
  await page
    .getByPlaceholder('Ajoutez des tâches, une par ligne · ⌘/Ctrl + ⏎')
    .waitFor({ state: 'visible' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/composer-fr.png`, fullPage: true });

  // Type two lines so the ICU plural counter and the "Ajouter {count}" button render.
  await page
    .getByPlaceholder('Ajoutez des tâches, une par ligne · ⌘/Ctrl + ⏎')
    .fill('corriger la connexion\nmettre à jour les dépendances');
  await page.getByRole('button', { name: 'Ajouter 2' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/composer-fr-filled.png` });
});

test('folder picker over settings → personalisation — fr-FR', async ({ page }) => {
  await page.addInitScript(seedFrench);
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/settings/personalization');
  await page.getByText('Répertoire de travail', { exact: true }).first().waitFor({ state: 'visible' });

  await page.getByRole('button', { name: 'Parcourir' }).click();
  // The picker's title is its dialog *accessible name*, not visible text — which is
  // exactly the class of string the jsx-text-only lint gate can't see, so asserting on
  // it here is the point.
  await page.getByRole('dialog', { name: 'Choisir un dossier' }).waitFor({ state: 'visible' });
  // The listing is a gateway round-trip; let it land so the shot shows real rows.
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/folder-picker-fr.png` });
});

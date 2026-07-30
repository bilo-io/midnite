import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme D (dashboard slice) — the dashboard's migrated widgets + the
 * add-widget picker rendered under fr-FR, proving the new `dashboard` namespace
 * reads end-to-end (widget titles, editor copy, the localised catalogue labels /
 * descriptions / category headers the picker search filters on). The locale rides
 * the Phase 43 settings blob the pre-paint init script resolves. Preview PNGs only
 * (no baselines) — the full-surface fr-FR walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test('dashboard widgets + add-widget picker — fr-FR', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.theme', 'dark');
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem(
        'midnite.settings',
        JSON.stringify({ locale: 'fr-FR', inactivityTimeoutS: 86_400 }),
      );
      // Seed the board with the migrated widgets so the shot shows them all.
      localStorage.setItem(
        'midnite.dashboard.widgets',
        JSON.stringify([
          { type: 'clock', config: { mode: 'digital' } },
          { type: 'date' },
          { type: 'calendar' },
          { type: 'digest' },
          { type: 'timer', config: { workMin: 25, breakMin: 5 } },
          {
            type: 'world-clocks',
            config: { mode: 'digital', zones: [{ label: 'Berlin', tz: 'Europe/Berlin' }] },
          },
          {
            type: 'finances',
            id: 'fin-1',
            config: {
              title: '',
              income: [{ id: 'a', label: 'Salaire', amount: 3000 }],
              expenses: [{ id: 'b', label: 'Loyer', amount: 1200 }],
              showDetail: true,
            },
          },
        ]),
      );
    } catch {
      // storage unavailable — the default locale is the fallback
    }
  });
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/dashboard');
  // The French calendar-widget title doubles as the grid-hydrated signal.
  await page.getByText('Calendrier', { exact: true }).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/dashboard-fr.png`, fullPage: true });

  // The add-widget picker: localised catalogue labels, descriptions + categories.
  await page.getByRole('button', { name: 'Ajouter un widget' }).click();
  await page.getByRole('textbox', { name: 'Rechercher des widgets' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/dashboard-fr-picker.png` });
});

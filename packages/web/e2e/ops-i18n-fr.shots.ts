import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme D (ops slice) — the ops board and its Decisions tab under fr-FR.
 *
 * What a unit test can't show: the card **headings** come from `ops.cards.<type>.title`
 * rather than the picker's catalog entry, and four of them deliberately say more than the
 * entry does — so seeing `Débit (enregistré côté serveur)` and `Temps de cycle (attente vs
 * travail)` side by side on the real board is the assertion. The chart interiors (axis
 * ticks, legend series, the `useUnitFormat` durations) also only lay out at real widths,
 * where recharts actually measures.
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

test('ops board (metrics) — fr-FR', async ({ page }) => {
  await page.addInitScript(seedFrench);
  await page.addInitScript(() => {
    try {
      // Seed the full widget set so every card heading appears in one shot.
      localStorage.setItem(
        'midnite.ops.widgets',
        JSON.stringify([
          { type: 'gauges' },
          { type: 'throughput' },
          { type: 'outcomes' },
          { type: 'duration' },
          { type: 'spend' },
          { type: 'cost-trend' },
          { type: 'cost-breakdown' },
          { type: 'cycle-time' },
          { type: 'fleet-trend' },
          { type: 'run-timeline' },
          { type: 'task-health' },
          { type: 'runtime-health' },
        ]),
      );
    } catch {
      // best-effort seed
    }
  });
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/ops');
  // A card heading that differs from its catalog entry doubles as the hydrated signal —
  // and is itself the thing being asserted.
  await page.getByText('Débit (enregistré côté serveur)', { exact: true }).first().waitFor({ state: 'visible' });
  // The metric cards each poll on mount; let them land so the shot shows rendered axes.
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/ops-fr.png`, fullPage: true });

  // The picker: localised catalogue labels, descriptions + category headers.
  await page.getByRole('button', { name: 'Ajouter un widget d’exploitation' }).click();
  await page.getByRole('textbox', { name: 'Rechercher des widgets d’exploitation' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ops-fr-picker.png` });
});

test('ops decisions tab — fr-FR', async ({ page }) => {
  await page.addInitScript(seedFrench);
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/ops?tab=decisions');
  await page.getByRole('tab', { name: 'Décisions' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/ops-decisions-fr.png` });
});

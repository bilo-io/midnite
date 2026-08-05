import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme D (dashboard **round 2**) — the widgets the first dashboard slice
 * (PR #580) didn't cover, plus the landing hero, under fr-FR.
 *
 * Kept separate from `dashboard-i18n-fr.shots.ts` rather than folded into it: that shot
 * pins the clock/date/calendar/finances set and its add-widget picker, and its seeded
 * widget list is the thing being asserted. This one seeds a *different* board — the
 * agents/health/activity/cost/cycle-time/usage cluster — so the two would fight over
 * `midnite.dashboard.widgets` if merged.
 *
 * What it's proving that a unit test can't: the card **headers** now come from the widget
 * catalog (`dashboard.catalog.<type>.label`) rather than a hardcoded `title=` prop, and
 * the chart interiors — axis ticks, legend series, footnotes — render French at real
 * layout sizes where recharts actually measures. Preview PNGs only (no baselines); the
 * full-surface fr-FR walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test('round-2 widgets (agents, health, charts) — fr-FR', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.theme', 'dark');
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      localStorage.setItem(
        'midnite.settings',
        JSON.stringify({ locale: 'fr-FR', inactivityTimeoutS: 86_400 }),
      );
      localStorage.setItem(
        'midnite.dashboard.widgets',
        JSON.stringify([
          { type: 'tile-backlog' },
          { type: 'tile-done' },
          { type: 'activity' },
          { type: 'agents' },
          { type: 'health' },
          { type: 'repo-status' },
          { type: 'throughput' },
          { type: 'cycle-time', config: { windowDays: 7, groupBy: 'none' } },
          { type: 'cost-by-repo', config: { windowDays: 7 } },
          { type: 'fleet-trend', config: { series: 'queueDepth' } },
          { type: 'usage' },
          { type: 'disk' },
          { type: 'storage' },
          { type: 'system-monitor' },
          { type: 'memories' },
          { type: 'shipped' },
          { type: 'quick-capture' },
          { type: 'links', config: { links: [{ label: 'Docs', url: 'https://example.com' }] } },
          { type: 'scratchpad', id: 'pad-1', config: { title: '', text: '' } },
        ]),
      );
    } catch {
      // storage unavailable — the default locale is the fallback
    }
  });
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/dashboard');
  // A catalog-sourced French card header doubles as the grid-hydrated signal — and is
  // itself the assertion, since this header used to be an English prop string.
  await page.getByText('Fil d’activité', { exact: true }).first().waitFor({ state: 'visible' });
  // The charts poll on mount; give the metrics calls time to land so the shot shows
  // rendered axes rather than the loading line.
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/dashboard-round2-fr.png`, fullPage: true });
});

test('landing hero (greeting, clock, weather) — fr-FR', async ({ page }) => {
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

  await page.goto('/');
  // The greeting types itself out one character at a time, and the clock's date line
  // renders once the client resolves `now` — wait for the whole intro to settle rather
  // than racing it.
  await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/landing-fr.png` });
});

import { resolve } from 'node:path';

import { test, type Page } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 66 F + 67 D/E — capture each product guide's first spotlight step (dimmed
 * page with a knockout + a step card) across the covered surfaces, in light + dark.
 * Every guide is launched the real way a user reaches it: open the assistant FAB →
 * "Guides" (the all-guides index, Phase 67 C) → click the guide. Anchored surfaces
 * render even with no seeded data, so no seed is needed.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

/** One guide per covered surface: its route + the label shown in the index. */
const GUIDES = [
  { route: '/tasks', label: 'Board tour', name: 'board' },
  { route: '/dashboard', label: 'Dashboard tour', name: 'dashboard' },
  { route: '/office', label: 'Office tour', name: 'office' },
  { route: '/projects', label: 'Projects tour', name: 'projects' },
  { route: '/digests', label: 'Digests tour', name: 'digests' },
  { route: '/search', label: 'Search tour', name: 'search' },
  { route: '/settings', label: 'Settings tour', name: 'settings' },
] as const;

async function seedQuiet(page: Page, scheme: 'light' | 'dark') {
  await page.addInitScript((s) => {
    try {
      localStorage.setItem('midnite.theme', s);
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      // Turn off auto-show so the tour only starts when we launch it explicitly.
      localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86_400, autoShowGuides: false }));
    } catch {
      // storage unavailable — colorScheme is the fallback
    }
  }, scheme);
  await page.emulateMedia({ colorScheme: scheme });
}

for (const scheme of ['light', 'dark'] as const) {
  for (const guide of GUIDES) {
    test(`guide ${guide.name} first step — ${scheme}`, async ({ page }) => {
      await seedQuiet(page, scheme);
      await page.goto(guide.route);

      // Open the assistant → the all-guides index (Phase 67 C).
      const fab = page.getByRole('button', { name: 'Open assistant' });
      await fab.waitFor({ state: 'visible' });
      await fab.click();
      await page.getByRole('button', { name: /Guides/i }).click();

      // Click this guide by its exact label (the accessible name also carries a
      // subtitle, so filter the button that contains the exact label text — and
      // avoid "Board tour" matching "Dashboard tour" as a substring).
      await page
        .getByRole('button')
        .filter({ has: page.getByText(guide.label, { exact: true }) })
        .first()
        .click();

      // The overlay (Skip/Next controls) opens once the guide starts.
      await page.getByRole('button', { name: 'Skip' }).waitFor({ state: 'visible' });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/guide-${guide.name}-step1-${scheme}.png` });
    });
  }

  // Phase 67 A — the new "Product guides" auto-show toggle in Settings →
  // Appearance, which turns the once-per-page auto-launch on/off.
  test(`guide auto-show setting — ${scheme}`, async ({ page }) => {
    await page.addInitScript((s) => {
      try {
        localStorage.setItem('midnite.theme', s);
        localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
        sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
        localStorage.setItem('midnite.settings', JSON.stringify({ inactivityTimeoutS: 86_400 }));
      } catch {
        // storage unavailable — colorScheme is the fallback
      }
    }, scheme);
    await page.emulateMedia({ colorScheme: scheme });

    await page.goto('/settings');
    const header = page.getByRole('button', { name: /Product guides/i });
    await header.waitFor({ state: 'visible' });
    await header.click();
    await page.getByRole('switch', { name: 'Auto-show guides' }).waitFor({ state: 'visible' });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/guide-auto-show-setting-${scheme}.png` });
  });
}

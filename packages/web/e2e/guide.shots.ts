import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 66 F — capture the replayable guide overlay in light + dark: the board
 * tour's first spotlight step (dimmed page with a knockout around the board
 * column + a step card) and a later step. The board columns render even with no
 * seeded tasks, so no seed is needed.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

for (const scheme of ['light', 'dark'] as const) {
  test(`guide overlay — ${scheme}`, async ({ page }) => {
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

    await page.goto('/tasks');
    const fab = page.getByRole('button', { name: 'Open assistant' });
    await fab.waitFor({ state: 'visible' });
    await fab.click();

    // Start the board tour from the panel.
    await page.getByRole('button', { name: /Guide/i }).click();
    await page.getByRole('dialog', { name: 'Your board' }).waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/guide-board-step1-${scheme}.png` });

    // Advance to the next step.
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/guide-board-step2-${scheme}.png` });
  });
}

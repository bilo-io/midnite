import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 68 A/B/D — capture the accent gradient builder in Settings → Appearance:
 * the default brand rainbow + gradient presets + solids gallery, and the expanded
 * custom builder (type / mono-multi / stops / angle + live preview), in light +
 * dark. No seeded data needed — Appearance is localStorage-driven.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

for (const scheme of ['light', 'dark'] as const) {
  test(`accent gradient builder — ${scheme}`, async ({ page }) => {
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

    // The "Accent" accordion is open by default; bring it into view.
    const accentHeading = page.getByText('Accent', { exact: true }).first();
    await accentHeading.waitFor({ state: 'visible' });
    await accentHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Gallery state: brand rainbow selected, gradient presets + solids.
    await page.screenshot({ path: `${OUT}/accent-gallery-${scheme}.png` });

    // Expand the custom builder (type / mono-multi / stops / angle + preview).
    await page.getByRole('button', { name: /customise/i }).click();
    await page.getByLabel('Angle').waitFor({ state: 'visible' });
    await page.getByRole('radio', { name: 'Conic' }).click();
    await page.waitForTimeout(300);
    await accentHeading.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/accent-custom-builder-${scheme}.png` });
  });
}

import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 68 C+E — the gradient accent painted on real surfaces (primary buttons /
 * CTAs / active states via `bg-primary`) and the Appearance builder's new Animate
 * toggle. A vivid 3-stop custom gradient is seeded so the effect is unmistakable.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

const CUSTOM_GRADIENT = {
  accent: { kind: 'gradient', preset: 'custom', type: 'linear', stops: ['violet', 'cyan', 'amber'], angle: 120, animate: false },
  accentSecondary: { kind: 'solid', swatch: 'rose' },
  inactivityTimeoutS: 86_400,
};

for (const scheme of ['light', 'dark'] as const) {
  test(`accent gradient surfaces — ${scheme}`, async ({ page }) => {
    await page.addInitScript(
      (args) => {
        try {
          localStorage.setItem('midnite.theme', args.scheme);
          localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
          sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
          localStorage.setItem('midnite.settings', JSON.stringify(args.settings));
        } catch {
          // storage unavailable — colorScheme is the fallback
        }
      },
      { scheme, settings: CUSTOM_GRADIENT },
    );
    await page.emulateMedia({ colorScheme: scheme });

    // Settings → Appearance: the accent section with a custom gradient + Animate toggle.
    await page.goto('/settings');
    const accentHeading = page.getByText('Accent', { exact: true }).first();
    await accentHeading.waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /customise/i }).click();
    await page.getByRole('checkbox', { name: /animate the gradient/i }).waitFor({ state: 'visible' });
    await accentHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/accent-surfaces-settings-${scheme}.png` });

    // A page with primary buttons/CTAs painted by the gradient.
    await page.goto('/tasks');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/accent-surfaces-board-${scheme}.png` });
  });
}

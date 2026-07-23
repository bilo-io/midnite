import { resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme C — the register auth flow and a settings subpage rendered
 * under fr-FR, proving the migrated auth/settings surfaces read the French
 * catalog end-to-end. Locale rides the Phase 43 settings blob the pre-paint
 * init script resolves. Preview PNGs only — the full-surface fr-FR walkthrough
 * is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test('register + settings appearance — fr-FR', async ({ page }) => {
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
  // Reduced motion so the auth layout's intro cascade (opacity-0 → 100 over the
  // hero beat sequence) skips straight to its settled state — otherwise the
  // form panel can still read opacity-0 (a Playwright "visible" pass ignores
  // opacity) when the shot is taken.
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });

  // The dev server doesn't set NEXT_PUBLIC_REGISTRATION_OPEN, so /register renders
  // its closed-state copy — still proves the auth namespace's French wiring.
  await page.goto('/register');
  await page.getByRole('heading', { name: 'Inscriptions fermées' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/auth-register-fr.png` });

  // A gateway boot-race can transiently 401 and client-redirect to /login on
  // the first navigation (see docs/screenshots gotcha in the e2e README);
  // retry once and re-navigate if we land there.
  await page.goto('/settings');
  if (page.url().includes('/login')) {
    await page.goto('/settings');
  }
  await page.getByRole('heading', { name: 'Paramètres' }).waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/settings-appearance-fr.png` });
});

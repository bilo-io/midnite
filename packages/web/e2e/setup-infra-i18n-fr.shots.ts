import { resolve } from 'node:path';

import { test, type Page } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 82 Theme D (setup / routines / infra-chrome) — the surfaces this slice
 * migrated, rendered under fr-FR: the first-run setup wizard (all five steps'
 * breadcrumb plus the provider step), the setup nudge's checklist with its ICU
 * plural, Settings → Agents (the per-CLI card and the heartbeat dropdown whose
 * copy came out of a `.ts` module), and the login hero's rotating copy pair.
 *
 * The locale rides the Phase 43 settings blob the pre-paint init resolves.
 * Preview PNGs only (no baselines) — the full-surface walkthrough is Theme F.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

/** Dark theme + fr-FR before first paint. `dismissWizard` is opt-out per test. */
function seedLocale(page: Page, dismissWizard = true) {
  return page.addInitScript(
    ({ dismiss }: { dismiss: boolean }) => {
      try {
        localStorage.setItem('midnite.theme', 'dark');
        if (dismiss) {
          localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
          sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
        }
        localStorage.setItem(
          'midnite.settings',
          JSON.stringify({ locale: 'fr-FR', inactivityTimeoutS: 86_400 }),
        );
      } catch {
        // storage unavailable — the default locale is the fallback
      }
    },
    { dismiss: dismissWizard },
  );
}

test('setup wizard — fr-FR', async ({ page }) => {
  // Deliberately *not* dismissed: the wizard auto-opens while the install isn't
  // ready, which is the only way to see it without a synthetic mount.
  await seedLocale(page, false);
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Assistant de configuration' });
  if (await dialog.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/setup-wizard-fr.png`, fullPage: false });
  } else {
    // A ready install never opens it. Capture the nudge-free dashboard instead so
    // the run still records *something* rather than silently passing on nothing.
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/setup-wizard-fr-skipped.png`, fullPage: false });
  }
});

test('settings → agents — fr-FR', async ({ page }) => {
  await seedLocale(page);
  await page.emulateMedia({ colorScheme: 'dark' });

  // Settings pages cold-compile slowly under `next dev`; a bounded wait keeps the
  // test inside the 60s budget rather than spending it all in one `waitFor`.
  await page.goto('/settings/agents', { waitUntil: 'domcontentloaded' });
  // The heartbeat dropdown carries the copy that used to live in
  // `lib/app-settings.ts` — the `.ts`-module gap this slice closed.
  await page
    .getByRole('combobox')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 })
    .catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/settings-agents-fr.png`, fullPage: true });
});

test('login hero — fr-FR', async ({ page }) => {
  await seedLocale(page);
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // The hero runs an intro choreography (logo glide → title typed → subtitle
  // fades in) before any copy exists, so a fixed wait caught only the starfield.
  // Wait for the typed <h2> to hold real text — the same timing the auth-hero
  // story's a11y flake comes from, hence asserting on content not on a delay.
  await page
    .locator('h2')
    .first()
    .filter({ hasText: /\S/ })
    .waitFor({ state: 'visible', timeout: 25_000 })
    .catch(() => {});
  await page.waitForTimeout(1_200);
  await page.screenshot({ path: `${OUT}/login-hero-fr.png`, fullPage: false });
});

test('notification centre — fr-FR', async ({ page }) => {
  await seedLocale(page);
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
  // Wait for the board itself before reaching for chrome — clicking into a
  // half-hydrated page is how the first attempt captured a bare starfield.
  await page
    .getByRole('button', { name: /notifications/i })
    .first()
    .waitFor({ state: 'visible', timeout: 25_000 });
  await page.getByRole('button', { name: /notifications/i }).first().click();
  // The panel's own French heading is the "it opened" signal; without this the
  // screenshot races the dropdown's mount animation.
  await page
    .getByRole('button', { name: 'Tout marquer comme lu' })
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/notifications-fr.png`, fullPage: false });
});

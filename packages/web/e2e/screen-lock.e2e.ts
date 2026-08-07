import type { Page } from '@playwright/test';

import { expect, mergeSettings, test } from './helpers/harness';

/**
 * Screen lock (Phase 73 Theme C) — the idle/lock screensaver now renders on the
 * shared `@midnite/shell` `<LockScreen>` (neuro-cloud starfield + wake→passcode
 * orchestration), with web supplying the telemetry corners + cycling title. This
 * asserts the two lock modes are behaviour-preserving:
 *   - no passcode  → any key/click dismisses (the plain screensaver)
 *   - passcode set → the pad is required to leave (a correct code unlocks)
 * Triggered via the `midnite:lock-screen` window event (the command-palette hook),
 * so no idle wait is needed. No gateway seed — session counts fall back to idle.
 */
async function setup(page: Page, settings: Record<string, unknown>, passcode?: string): Promise<void> {
  await mergeSettings(page, settings);
  await page.addInitScript(
    ({ passcode }) => {
      try {
        localStorage.setItem('midnite.theme', 'dark');
        if (passcode) localStorage.setItem('midnite.passcode', JSON.stringify(passcode));
      } catch {
        /* best effort */
      }
    },
    { passcode },
  );
}

// Wait for the rail (proves React has hydrated + the footer Lock handler is live),
// then fire the rail's footer Lock button. `dispatchEvent('click')` targets the
// element directly, bypassing the actionability/stability checks that flake when
// the footer cluster (presence · connection) re-renders under it.
async function lock(page: Page): Promise<void> {
  await expect(page.locator('aside nav').first()).toBeVisible();
  // The rail footer's control is `nav.footer.lock` — "Lock". It was
  // `aria-label="Lock screen"` before the i18n sweep, and since accessible-name
  // matching is substring-based, "Lock screen" stopped matching "Lock" entirely
  // (the only surviving "Lock screen" is the command-palette entry, in a dialog
  // that isn't open here).
  await page.getByRole('button', { name: 'Lock', exact: true }).dispatchEvent('click');
}

test('lock with no passcode shows a dismissible screensaver', async ({ page }) => {
  await setup(page, { navMode: 'expanded', requirePasscode: false });
  await page.goto('/tasks');

  await lock(page);
  const dialog = page.getByRole('dialog', { name: /screensaver/i });
  await expect(dialog).toBeVisible();

  // Any key wakes it (no passcode → dismissible).
  await page.keyboard.press('Space');
  await expect(dialog).toBeHidden();
});

test('lock with a passcode keeps the screen locked through a wake gesture', async ({ page }) => {
  await setup(
    page,
    { navMode: 'expanded', requirePasscode: true, passcodeOnlyWhenLocked: false },
    '1234',
  );
  await page.goto('/tasks');

  await lock(page);
  const dialog = page.getByRole('dialog', { name: 'Locked screensaver' });
  await expect(dialog).toBeVisible();

  // A wake gesture must NOT dismiss a passcode-locked screen (unlike the plain
  // screensaver) — it reveals the pad; the lock stays up until a correct code.
  await page.keyboard.press('Space');
  await expect(dialog).toBeVisible();
});

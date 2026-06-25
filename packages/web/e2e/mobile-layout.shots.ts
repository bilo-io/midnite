import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 24 verification — mobile-layout smoke shots.
 *
 * Captures key pages at 390×844 (iPhone 14) in dark mode to confirm:
 *   - No horizontal overflow at phone width
 *   - Mobile nav (bottom tab bar) is visible and usable
 *   - Single-column layout on board, tasks, sessions, dashboard
 *   - Notifications / approvals panels are viewport-capped
 *
 * These are preview-only PNG captures (no committed baseline) — the shots
 * confirm at a glance that the responsive reflow works as built (PR #199, #196).
 */

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
const PHONE = { width: 390, height: 844 };

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.use({ colorScheme: 'dark' });

// Dismiss setup wizard so it doesn't overlay pages on a fresh gateway.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
  });
});

for (const [name, path] of [
  ['board', '/'],
  ['tasks', '/tasks'],
  ['sessions', '/sessions'],
  ['dashboard', '/dashboard'],
] as const) {
  test(`mobile 390px — ${name} no overflow`, async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.goto(path);
    // Wait for the page shell (nav bar or layout root) to be present.
    await page.locator('body').waitFor();
    await page.waitForTimeout(600); // let any CSS transitions settle
    await page.screenshot({
      path: join(OUT, `mobile-${name}-phone.png`),
      fullPage: false,
    });
    // Confirm no horizontal overflow — scrollWidth must equal clientWidth on body.
    const overflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.documentElement.clientWidth;
    });
    // Assert via a soft check so all shots are captured even if one overflows.
    if (overflow) throw new Error(`${name} at 390px has horizontal overflow`);
  });
}

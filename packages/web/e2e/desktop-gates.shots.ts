import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Phase 24 A3 — capture the desktop-only gates. The office canvas and the
 * workflow editor have no usable phone layout; below the `lg` breakpoint they
 * render a "best viewed on desktop" notice instead of a broken canvas. We shoot
 * the office at desktop (canvas) vs. phone (notice) as a before/after, plus the
 * workflow editor's phone notice.
 */

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.use({ colorScheme: 'dark' });

// Suppress the first-visit setup wizard (a fresh e2e gateway is unconfigured)
// so it doesn't overlay the gate we're capturing.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
  });
});

test('office — desktop renders the canvas', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/office');
  await page.locator('canvas').waitFor({ timeout: 15_000 });
  await page.screenshot({ path: join(OUT, 'desktop-gate-office-desktop.png') });
});

test('office — phone shows the desktop-only notice', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/office');
  await page.getByText('The office is best viewed on desktop').waitFor();
  await page.screenshot({ path: join(OUT, 'desktop-gate-office-phone.png') });
});

test('workflow editor — phone shows the desktop-only notice', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/workflows/edit?id=anything');
  await page.getByText('The workflow editor is best viewed on desktop').waitFor();
  await page.screenshot({ path: join(OUT, 'desktop-gate-workflow-phone.png') });
});

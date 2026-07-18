import { test } from '@playwright/test';

/**
 * Screenshot capture for the update banner (not an assertion spec). Run with
 * `UPDATE_SHOTS=1` to write PNGs for the PR. Stubs version.json to force the
 * banner, then shoots light + dark at desktop and mobile widths.
 */
const OUT = process.env['UPDATE_SHOTS_DIR'] || '/tmp/p71-shots';

test.describe('Update banner shots', () => {
  test.skip(!process.env['UPDATE_SHOTS'], 'set UPDATE_SHOTS=1 to capture');

  test.beforeEach(async ({ page }) => {
    await page.route(/\/(news|weather|market)\b/, (route) => route.abort());
    await page.route('**/version.json**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ version: '99.0.0', channel: 'stable', notesUrl: 'https://example.com' }),
      }),
    );
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`desktop ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/dashboard');
      await page.getByText(/a new version is available/i).waitFor();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/desktop-${theme}.png` });
    });
  }

  test('mobile light', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/dashboard');
    await page.getByText(/a new version is available/i).waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/mobile-light.png` });
  });
});

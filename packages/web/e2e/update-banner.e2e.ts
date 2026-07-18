import { expect, test } from '@playwright/test';

/**
 * App-update banner flow (Phase 71 Themes B/C). The running build's version is
 * baked in at build time; we stub the polled `/version.json` to control whether
 * an update appears. The SW is production-only (skipped under `next dev`), so
 * this exercises the version.json detection path — the banner still appears,
 * pushes the app down, dismisses, and re-surfaces on navigation.
 */
test.describe('Update banner', () => {
  // Keep the dashboard's external widgets from flaking the page.
  test.beforeEach(async ({ page }) => {
    await page.route(/\/(news|weather|market)\b/, (route) => route.abort());
  });

  test('appears for a newer version, dismisses, and re-surfaces on navigation', async ({ page }) => {
    await page.route('**/version.json**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ version: '99.0.0', channel: 'stable' }),
      }),
    );

    await page.goto('/dashboard');

    const banner = page.getByText(/a new version is available/i);
    await expect(banner).toBeVisible();

    // Dismiss hides it for this view (animates to 0 height → not visible).
    await page.getByRole('button', { name: /dismiss update notice/i }).click();
    await expect(banner).toBeHidden();

    // Reload / navigation re-surfaces it — dismissal is never persisted.
    await page.goto('/board');
    await expect(page.getByText(/a new version is available/i)).toBeVisible();
  });

  test('stays hidden when the build is up to date', async ({ page }) => {
    await page.route('**/version.json**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        // 0.0.0 is never newer than the built version → no update.
        body: JSON.stringify({ version: '0.0.0', channel: 'stable' }),
      }),
    );

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByText(/a new version is available/i)).toBeHidden();
  });
});

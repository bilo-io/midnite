import { expect, test } from '@playwright/test';

/**
 * Dashboard smoke flow. Its widgets proxy external data (Hacker News, weather,
 * market quotes); abort those so the page is deterministic and never flakes on
 * the network — the widgets fall back to their error state and the page still
 * renders. The dashboard's own data (counts/projects/tasks/notes/routines) comes
 * from the live gateway, so a broken route or contract mismatch still fails here.
 */
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/\/(news|weather|market)\b/, (route) => route.abort());
  });

  test('loads the page chrome and the prompt composer', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    // The always-present composer at the bottom of the page.
    await expect(page.getByPlaceholder(/Add tasks, one per line/)).toBeVisible();
  });
});

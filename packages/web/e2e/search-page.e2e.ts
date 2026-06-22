import { expect, test } from '@playwright/test';
import { seedTask } from './helpers/gateway';

test.describe('Dedicated /search page', () => {
  test('finds a seeded task, groups it, and routes on click', async ({ page }) => {
    const token = `srchpage${Date.now()}`;
    const title = `Search page probe ${token}`;
    await seedTask(title);

    await page.goto(`/search?q=${token}`);

    // Grouped under Tasks, with the result + a result-count summary.
    await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText(/result(s)? for/i)).toBeVisible();

    if (process.env['SEARCH_PAGE_SHOT']) {
      await page.screenshot({ path: process.env['SEARCH_PAGE_SHOT'], fullPage: true });
    }

    // A result links to its entity.
    await page.getByRole('link', { name: title }).click();
    await expect(page).toHaveURL(/\/tasks$/);
  });

  test('shows a no-results state for a miss', async ({ page }) => {
    await page.goto(`/search?q=definitely-no-such-entity-${Date.now()}`);
    await expect(page.getByText(/No results for/i)).toBeVisible();
  });
});

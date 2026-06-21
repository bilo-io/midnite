import { expect, test } from '@playwright/test';

/**
 * Happy-path "view" flow for councils, mirroring the workflows spec: the route
 * loads and the gateway-backed empty state renders (proving `getCouncils()`
 * resolved and parsed against the shared contract).
 */
test.describe('Councils', () => {
  test('loads and renders the empty state from the gateway', async ({ page }) => {
    await page.goto('/councils');

    await expect(page.getByRole('heading', { name: 'Councils', exact: true })).toBeVisible();
    await expect(page.getByText('No councils yet')).toBeVisible();
  });
});

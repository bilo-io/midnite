import { expect, test } from '@playwright/test';

/**
 * A happy-path "view" flow: the route loads and renders the gateway-backed empty
 * state. `listWorkflows()` validates the response against the shared schema, so a
 * contract mismatch would throw in the parse and this empty state would never
 * render — enough to catch a broken route or a drifted contract.
 */
test.describe('Workflows', () => {
  test('loads and renders the empty state from the gateway', async ({ page }) => {
    await page.goto('/workflows');

    await expect(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible();
    await expect(page.getByText('No workflows yet')).toBeVisible();
  });
});

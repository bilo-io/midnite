import { expect, test } from './helpers/harness';

import { seedWorkflow, uniqueLabel } from './helpers/gateway';

/**
 * A happy-path "view" flow: the route loads and renders the gateway-backed list.
 * `listWorkflows()` validates the response against the shared schema, so a broken
 * route or a drifted contract would throw in the parse and the seeded row below
 * would never appear.
 *
 * It asserts on a workflow it created itself rather than on the empty state. The
 * whole suite shares one gateway, and `retro-digest-pipeline` legitimately
 * installs the `daily-digest` template earlier in the run — so "no workflows
 * exist" is not something this spec can guarantee, and asserting it made the
 * outcome depend on the order (and timing) of everything before it. Reading a
 * seeded row is also the stronger contract check: it decodes a real
 * `WorkflowSummary` instead of only proving the empty branch renders.
 */
test.describe('Workflows', () => {
  test('loads and renders a gateway workflow', async ({ page }) => {
    const workflow = await seedWorkflow(uniqueLabel('E2E workflows — listed'));

    await page.goto('/workflows');

    await expect(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible();
    await expect(page.getByText(workflow.name)).toBeVisible();
  });
});

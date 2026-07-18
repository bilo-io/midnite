import { test } from '@playwright/test';

/**
 * Screenshot capture for the tasks control bar (not an assertion spec). Run with
 * SHOTS=1 to write PNGs: the default (icon-only Graph + Pause + Emergency stop,
 * Graph left of the search input) and the hover-expanded states.
 */
const OUT = process.env['SHOTS_DIR'] || '/tmp/tasks-controlbar-shots';

test.describe('tasks control bar shots', () => {
  test.skip(!process.env['SHOTS'], 'set SHOTS=1 to capture');

  test.beforeEach(async ({ page }) => {
    await page.route(/\/(news|weather|market)\b/, (route) => route.abort());
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`control bar ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/tasks');

      const bar = page.locator('.reveal-controls').first();
      await bar.waitFor();
      await page.getByPlaceholder('Search tasks').waitFor();
      await page.waitForTimeout(500);
      await bar.screenshot({ path: `${OUT}/controlbar-default-${theme}.png` });

      // Hover Pause → its label reveals and the button widens.
      await page.getByRole('button', { name: 'Pause scheduling' }).hover();
      await page.waitForTimeout(450);
      await bar.screenshot({ path: `${OUT}/controlbar-hover-pause-${theme}.png` });

      // Hover Graph → label reveals (it sits just left of the search input).
      await page.getByRole('link', { name: 'Graph' }).hover();
      await page.waitForTimeout(450);
      await bar.screenshot({ path: `${OUT}/controlbar-hover-graph-${theme}.png` });
    });
  }
});

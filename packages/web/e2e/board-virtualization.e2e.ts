import { expect, test } from '@playwright/test';

import { seedTask } from './helpers/gateway';

// Phase 57 F — the board columns are windowed (@tanstack/react-virtual): only the
// visible cards (+ overscan) mount, so the DOM stays bounded no matter the count.
// jsdom can't prove this (no layout/scroll), so we assert it against a real browser:
// seed many tasks into one column and confirm the mounted card count is far below
// the total. Each windowed row carries a `data-index`, so counting those = mounted rows.
const SEEDED = 60; // > the VirtualList threshold (50), so the column windows

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      /* best effort */
    }
  });
});

test('board columns keep the DOM bounded as the card count grows', async ({ page }) => {
  // Seed in parallel — all land in the same (todo) column.
  await Promise.all(
    Array.from({ length: SEEDED }, (_, i) => seedTask(`Virtualized board task ${i}`, 'todo')),
  );

  await page.goto('/tasks');
  // Wait until the board has rendered cards (windowed rows expose data-index).
  await expect(page.locator('[data-index]').first()).toBeVisible();

  const mounted = await page.locator('[data-index]').count();
  // Bounded: far fewer nodes than seeded (visible window + overscan), but non-zero.
  expect(mounted).toBeGreaterThan(0);
  expect(mounted).toBeLessThan(SEEDED);
});

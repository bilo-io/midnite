import { expect, test } from '@playwright/test';

import { seedTask } from './helpers/gateway';

// Phase 82 — the board is no longer windowed: columns grow to their full content
// height and the whole PAGE scrolls, so a full board reads as a tall page. This
// asserts that against a real browser — seed many tasks into one column and
// confirm every card mounts (windowing would have dropped the off-screen ones)
// and the document itself grows taller than the viewport.
const SEEDED = 60;

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

test('board grows with its content and scrolls the page (un-windowed)', async ({ page }) => {
  // Seed in parallel — all land in the same (todo) column.
  await Promise.all(
    Array.from({ length: SEEDED }, (_, i) => seedTask(`Board task ${i}`, 'todo')),
  );

  await page.goto('/tasks');

  // The first and last seeded cards both render — with windowing the off-screen
  // last card would not be in the DOM.
  await expect(page.getByText('Board task 0', { exact: true })).toBeVisible();
  await expect(page.getByText(`Board task ${SEEDED - 1}`, { exact: true })).toBeAttached();

  // The document scrolls (it's taller than the viewport) rather than a nested
  // per-column scroll region.
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewport = page.viewportSize();
  expect(docHeight).toBeGreaterThan((viewport?.height ?? 0) + 1);
});

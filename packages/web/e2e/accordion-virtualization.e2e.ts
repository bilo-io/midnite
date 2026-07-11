import { expect, test } from '@playwright/test';

import { seedProject, seedTask } from './helpers/gateway';

// Phase 57 F remainder — the status-grouped accordions (sessions / workflows /
// projects) window their rows against the DOCUMENT scroll (useWindowVirtualizer),
// so a huge section keeps the DOM bounded WITHOUT a per-section inner scrollbar
// (the reason these were originally deferred). jsdom can't prove layout/scroll, so
// we assert against a real browser via the projects tree (directly seedable): 60
// tasks in one project → the expanded project section windows its task rows.
const SEEDED = 60; // > the WindowVirtualList threshold (50), so the section windows

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      // The tree (accordion) layout lives in the Projects "table" view; the value
      // is stored as a raw string, not JSON.
      localStorage.setItem('midnite.projects.view', 'table');
    } catch {
      /* best effort */
    }
  });
});

test('accordion sections keep the DOM bounded, with no inner scrollbar', async ({ page }) => {
  const project = await seedProject('Virtualized tree project', 'many tasks');
  await Promise.all(
    Array.from({ length: SEEDED }, (_, i) =>
      seedTask(`Virtualized tree task ${i}`, 'todo', { projectId: project.id }),
    ),
  );

  await page.goto('/projects');
  // Windowed rows expose data-index; wait for the section to render some.
  await expect(page.locator('[data-index]').first()).toBeVisible();

  const mounted = await page.locator('[data-index]').count();
  // Bounded: far fewer nodes than seeded (visible window + overscan), but non-zero.
  expect(mounted).toBeGreaterThan(0);
  expect(mounted).toBeLessThan(SEEDED);

  // No inner scrollbar: the row's scroll parent is the document/window, not an
  // inner fixed-height container. Walk up from a windowed row and assert no
  // ancestor below <body> is itself vertically scrollable.
  const hasInnerScroll = await page.locator('[data-index]').first().evaluate((el) => {
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const scrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';
      if (scrollable && node.scrollHeight > node.clientHeight + 1) return true;
      node = node.parentElement;
    }
    return false;
  });
  expect(hasInnerScroll).toBe(false);
});

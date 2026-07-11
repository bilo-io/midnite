import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { test, expect } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedProject, seedTask } from './helpers/gateway';

/**
 * Phase 60 Theme J — mobile & responsive audit.
 *
 * Sweeps every top-level surface across the full breakpoint matrix (the tightest
 * phone at 320 up through a tablet + a landscape phone) and asserts the one
 * invariant CLAUDE.md mandates: **no horizontal body scroll** — the page must
 * never be wider than the viewport (overflowing content scrolls in its own
 * container, not the page). PNGs are preview-only evidence (gitignored __shots__).
 *
 * Doubles as the regression test for the fixes shipped in the same slice.
 */

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

const VIEWPORTS = [
  { name: '320', width: 320, height: 640 }, // smallest supported phone
  { name: '375', width: 375, height: 667 }, // iPhone SE
  { name: '390', width: 390, height: 844 }, // iPhone 14
  { name: '768', width: 768, height: 1024 }, // iPad portrait (md cutoff)
  { name: 'land', width: 844, height: 390 }, // landscape phone
] as const;

// Top-level surfaces that render on a freshly-seeded gateway (no agent run
// needed). Detail routes that require a live session/diff are covered by the
// seeded task's detail page below.
const SURFACES: readonly (readonly [string, string])[] = [
  ['board', '/'],
  ['tasks', '/tasks'],
  ['sessions', '/sessions'],
  ['dashboard', '/dashboard'],
  ['projects', '/projects'],
  ['memory', '/memory'],
  ['councils', '/councils'],
  ['media', '/media'],
  ['slides', '/slides'],
  ['workflows', '/workflows'],
  ['ops', '/ops'],
  ['search', '/search?q=e2e'],
  ['settings', '/settings'],
  ['settings-appearance', '/settings/appearance'],
  ['settings-api-tokens', '/settings/api-tokens'],
  ['settings-integrations', '/settings/integrations'],
];

let taskId = '';

test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  const project = await seedProject('E2E mobile audit', 'mob');
  const task = await seedTask('E2E mobile audit — a task with a reasonably long title to test truncation', 'todo', {
    projectId: project.id,
  });
  taskId = task.id;
});

test.use({ colorScheme: 'dark' });

// `next dev` compiles each route on first visit — with ~19 routes that first
// sweep is slow, so give each viewport test a generous budget (subsequent
// viewports reuse the already-compiled routes and run fast).
test.describe.configure({ timeout: 300_000 });

test.beforeEach(async ({ page }) => {
  // Dismiss the setup wizard so it doesn't overlay pages on a fresh gateway.
  await page.addInitScript(() => {
    window.localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
  });
});

/** Pixels the page body sticks out past the viewport (0 = no horizontal scroll). */
async function hasHorizontalOverflow(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, document.body.scrollWidth - doc.clientWidth);
  });
}

for (const vp of VIEWPORTS) {
  test(`mobile audit @ ${vp.name} — no horizontal body scroll`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });

    const offenders: string[] = [];
    const routes: readonly (readonly [string, string])[] = [
      ...SURFACES,
      ['task-detail', `/tasks/view?id=${taskId}`],
    ];

    for (const [name, path] of routes) {
      try {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
      } catch {
        // A client-side redirect can abort the initial navigation; retry once.
        await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
      await page.locator('body').waitFor();
      await page.waitForTimeout(300); // let transitions/CSS settle
      await page.screenshot({ path: join(OUT, `mobile-${vp.name}-${name}.png`), fullPage: false });
      const overflowPx = await hasHorizontalOverflow(page);
      if (overflowPx > 0) offenders.push(`${name} (+${overflowPx}px)`);
    }

    expect(offenders, `Horizontal body scroll at ${vp.width}px on: ${offenders.join(', ')}`).toEqual([]);
  });
}

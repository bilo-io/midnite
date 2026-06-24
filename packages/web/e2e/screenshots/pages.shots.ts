import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from '../config';
import { seedTask } from '../helpers/gateway';
import { freezeForCapture, SEED_TASKS, SHOT_PAGES } from '../helpers/screenshots';

/**
 * Phase 10 Theme E1+E2 — deterministic screenshot capture + visual regression.
 *
 * Drives the real app (Next dev → seeded gateway, same webServer as the flow
 * specs) and captures every key page in **light and dark** at 1440×900.
 *
 * Two outputs per page:
 *  - `page.screenshot()` → `e2e/__shots__/<name>-<theme>.png` (gitignored).
 *    Preview artifacts for PR review / CI artifact upload (Theme E1/E3).
 *  - `expect(page).toHaveScreenshot()` → asserts against committed OS-pinned
 *    baselines in `e2e/__screenshots__/` (Theme E2). Fails on unexpected pixel
 *    changes; update with `--update-snapshots` (run via Docker for Linux parity,
 *    so CI on ubuntu-latest always matches exactly).
 *
 * Regenerate Linux baselines:
 *   docker run --rm --ipc=host --platform linux/amd64 \
 *     -v "$(pwd)":/work -w /work/packages/web \
 *     mcr.microsoft.com/playwright:v1.61.0-jammy \
 *     bash -c "npm i -g pnpm@10 && pnpm install --frozen-lockfile && \
 *       pnpm exec playwright test --project=screenshots --update-snapshots"
 */

const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

// A fixed instant so any date/clock-driven widget renders identically every run.
const FROZEN_TIME = new Date('2026-06-22T15:30:00.000Z');

const THEMES = ['light', 'dark'] as const;

test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  // Seed a spread across columns so the board capture isn't empty.
  await Promise.all(SEED_TASKS.map((t) => seedTask(t.prompt, t.status)));
});

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });

    test.beforeEach(async ({ page }) => {
      await freezeForCapture(page, theme);
      // Force reduced-motion at the page level: the app's typewriter header +
      // page-reveal honour `prefers-reduced-motion` and render their final state
      // instantly, so a capture never lands mid-animation. (`reducedMotion` isn't
      // accepted in a project's `use` in this Playwright version, so it's set
      // here — the one place that actually drives the running page.)
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
      // Fix Date.now()/new Date() without pausing timers — clocks read stable,
      // but rAF/timer-driven UI (the office canvas) still animates and paints.
      await page.clock.setFixedTime(FROZEN_TIME);
      // The dashboard widgets proxy external data (Hacker News, weather, market
      // quotes); abort those so the page is deterministic and never flakes.
      await page.route(/\/(news|weather|market)\b/, (route) => route.abort());
    });

    test(`captures the key pages (${theme})`, async ({ page }) => {
      for (const pg of SHOT_PAGES) {
        await page.goto(pg.path);
        await pg.ready(page);
        const name = `${pg.name}-${theme}.png`;
        // E1: write a preview PNG to __shots__/ (gitignored, for artifact upload).
        await page.screenshot({ path: join(OUT, name) });
        // E2: assert against the committed OS-pinned baseline; fails on unexpected
        // pixel changes. Update baselines with --update-snapshots via Docker.
        await expect(page).toHaveScreenshot(name);
      }
    });
  });
}

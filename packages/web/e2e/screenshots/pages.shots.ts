import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { test } from '@playwright/test';

import { SCREENSHOTS_DIR } from '../config';
import { seedTask } from '../helpers/gateway';
import { freezeForCapture, SEED_TASKS, SHOT_PAGES } from '../helpers/screenshots';

/**
 * Phase 10 Theme E1 — deterministic screenshot capture.
 *
 * Drives the real app (Next dev → seeded gateway, same webServer as the flow
 * specs) and captures every key page in **light and dark** at 1440×900.
 *
 * One output per page: `page.screenshot()` → `e2e/__shots__/<name>-<theme>.png`
 * (gitignored). Preview artifacts for PR review / CI artifact upload.
 *
 * **No `toHaveScreenshot` baselines.** The committed baselines were generated on
 * macOS while the CI job runs on `ubuntu-latest`, so the assertion could not
 * pass there — and it never got the chance to try: the visual step sat behind a
 * flow step that failed on every run, so it was `skipped` every time. Rather
 * than carry OS-pinned PNGs that only a Docker round-trip can regenerate, this
 * captures for human review and the flow specs own the behavioural assertions.
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
        // Write a preview PNG to __shots__/ (gitignored, for artifact upload).
        await page.screenshot({ path: join(OUT, name) });
      }
    });
  });
}

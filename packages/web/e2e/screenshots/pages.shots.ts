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
 * specs) and saves a PNG of every key page in **light and dark**, at the fixed
 * 1440×900 viewport the `screenshots` project pins. Determinism is engineered,
 * not hoped for: stable seed data, a frozen clock (so the world-clock/market
 * widgets don't drift), reduced motion + a hard animation-kill stylesheet, and
 * the external dashboard widgets (news/weather/market) stubbed.
 *
 * These are **preview artifacts**, not `toHaveScreenshot` baselines — there's no
 * pixel assertion here, so the spec never fails on a rendering delta and never
 * commits OS-specific images. The committed visual baseline + diff is Theme E2;
 * uploading these as PR artifacts + a gallery is Theme E3. Run on its own with
 * `moon run web:screenshots`; the PNGs land in `e2e/__shots__/` (gitignored).
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
      // Force reduced-motion at the page level (the project `use` sets it too, but
      // assert it here so it's unmissable): the app's typewriter header + page-reveal
      // honour `prefers-reduced-motion` and render their final state instantly, so a
      // capture never lands mid-animation.
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
        await page.screenshot({ path: join(OUT, `${pg.name}-${theme}.png`) });
      }
    });
  });
}

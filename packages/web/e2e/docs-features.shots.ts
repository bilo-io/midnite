import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { freezeForCapture, SEED_TASKS } from './helpers/screenshots';
import { seedMemory, seedProject, seedTask } from './helpers/gateway';

// Capture the feature screenshots embedded by the docs app's product-feature
// pages (packages/docs/src/content/{app,agents,overview,settings}). The docs app
// never talks to the gateway, so its screens are committed static images; this
// spec is how they're (re)generated against a freshly-seeded e2e gateway.
//
// It writes PNGs straight into the docs package's asset dir so a page can import
// them. It is a `*.shots.ts` so it reuses the harness's auto-booted gateway + Next
// server (playwright.config.ts, `screenshots` project, 1440×900), but it is gated
// behind CAPTURE_DOCS so a routine `moon run web:screenshots` skips it:
//
//   CAPTURE_DOCS=1 pnpm exec playwright test --project=screenshots docs-features.shots.ts
//
// Each feature is captured in BOTH themes (`<name>-light.png` / `<name>-dark.png`)
// so the docs page can show whichever matches the reader's active theme.
const OUT = resolve(process.cwd(), '..', 'docs', 'src', 'content', 'assets');

/** One feature page: its stem (`<name>.png`), route, and a readiness wait. */
type FeatureShot = { name: string; path: string; ready: (page: Page) => Promise<void> };

/** Default readiness: the network settles and the app paints a beat. */
async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

const FEATURE_SHOTS: FeatureShot[] = [
  // App
  { name: 'projects', path: '/projects', ready: settled },
  {
    name: 'tasks',
    path: '/tasks',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();
      await expect(page.getByText(SEED_TASKS[0]!.prompt)).toBeVisible();
    },
  },
  { name: 'slides', path: '/slides', ready: settled },
  {
    name: 'workflows',
    path: '/workflows',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible();
      await settled(page);
    },
  },
  // Agents
  { name: 'memory', path: '/memory', ready: settled },
  { name: 'sessions', path: '/sessions', ready: settled },
  {
    name: 'councils',
    path: '/councils',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Councils', exact: true })).toBeVisible();
      await settled(page);
    },
  },
  { name: 'media', path: '/media', ready: settled },
  // Overview
  {
    name: 'dashboard',
    path: '/dashboard',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
      await settled(page);
    },
  },
  {
    name: 'office',
    path: '/office',
    ready: async (page) => {
      await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(1500);
    },
  },
  { name: 'digests', path: '/digests', ready: settled },
  { name: 'ops', path: '/ops', ready: settled },
  // Settings
  { name: 'settings', path: '/settings', ready: settled },
];

test.describe('docs feature screenshots', () => {
  test.skip(!process.env['CAPTURE_DOCS'], 'set CAPTURE_DOCS=1 to (re)generate docs screenshots');

  test.beforeAll(async () => {
    mkdirSync(OUT, { recursive: true });
    // A little seed data so the board, projects, and memory screens aren't empty.
    const project = await seedProject('Website relaunch', 'Ship the new marketing site');
    await Promise.all(SEED_TASKS.map((t) => seedTask(t.prompt, t.status, { projectId: project.id })));
    await seedMemory('Team conventions', 'House style, naming, and review norms.');
  });

  for (const shot of FEATURE_SHOTS) {
    for (const theme of ['light', 'dark'] as const) {
      test(`capture ${shot.name} (${theme})`, async ({ page }) => {
        // Reduced motion so the typewriter page-title header renders its final
        // string instantly (it honours prefers-reduced-motion) — otherwise a
        // capture can land mid-type (e.g. "Tas" for "Tasks").
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await freezeForCapture(page, theme);
        await page.addInitScript(() => {
          try {
            localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
          } catch {
            /* best effort */
          }
        });
        await page.goto(shot.path);
        await shot.ready(page);
        await page.screenshot({ path: join(OUT, `${shot.name}-${theme}.png`) });
      });
    }
  }
});

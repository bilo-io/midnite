import { expect, type Page } from '@playwright/test';

import type { Status } from '@midnite/shared';

/** A page to capture: its route and a predicate that resolves once it's stable. */
export type ShotPage = {
  /** File-name stem (`<name>-<theme>.png`). */
  name: string;
  /** Route under the web origin. */
  path: string;
  /** Wait until the page has settled enough to capture deterministically. */
  ready: (page: Page) => Promise<void>;
};

/**
 * Tasks the capture seeds before shooting the board, spread across columns so
 * the board isn't empty. All non-`wip` (the scheduler only spawns on `wip`, and
 * the e2e pool is disabled anyway). The gateway runs with the LLM off, so each
 * task's title is its prompt's first line — i.e. the prompt text appears on the
 * card, which the board `ready` below waits for.
 */
export const SEED_TASKS: { prompt: string; status: Status }[] = [
  { prompt: 'Wire up the settings drawer', status: 'todo' },
  { prompt: 'Investigate flaky terminal spec', status: 'todo' },
  { prompt: 'Audit the colour tokens', status: 'backlog' },
  { prompt: 'Draft the release notes', status: 'waiting' },
  { prompt: 'Ship the search index backfill', status: 'done' },
];

/**
 * The key pages Phase 10 Theme E1 previews. Each `ready` waits on an accessible
 * landmark (role/text, never a test id), so a capture only happens once the
 * gateway-backed view has actually rendered.
 */
export const SHOT_PAGES: ShotPage[] = [
  {
    name: 'board',
    path: '/tasks',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible();
      // Wait for real cards, not the loading skeletons — a seeded title only
      // renders once TanStack Query has resolved the board data.
      await expect(page.getByText(SEED_TASKS[0]!.prompt)).toBeVisible();
    },
  },
  {
    name: 'dashboard',
    path: '/dashboard',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    },
  },
  {
    name: 'workflows',
    path: '/workflows',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible();
    },
  },
  {
    name: 'councils',
    path: '/councils',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Councils', exact: true })).toBeVisible();
    },
  },
  {
    name: 'office',
    path: '/office',
    ready: async (page) => {
      await expect(page.getByRole('heading', { name: 'Office', exact: true })).toBeVisible();
      // The Phaser game mounts a <canvas> a tick after the HUD (StrictMode guard).
      await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
      // Reduced-motion can't stop a rAF render loop, so give the canvas a beat to
      // paint its first frames before the shot. (Capture-only — no pixel assert.)
      await page.waitForTimeout(1500);
    },
  },
];

/**
 * Per-page init applied before any app script runs: force the colour theme via
 * the same localStorage key the app's theme-init script reads, and kill
 * animations/transitions so a capture is frame-independent. `prefers-reduced-
 * motion` is also set at the project level, but a hard CSS override covers any
 * animation that ignores the media query.
 */
export async function freezeForCapture(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('midnite.theme', t);
      // Hide the first-run setup nudge — on a fresh e2e gateway (no provider) it
      // would otherwise float over every page's corner and occlude the capture.
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    } catch {
      // Web storage can be unavailable; the project colorScheme is the fallback.
    }
    const css = `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important;caret-color:transparent!important;}`;
    const style = document.createElement('style');
    style.textContent = css;
    // documentElement always exists at init time; <head> may not yet.
    document.documentElement.appendChild(style);
  }, theme);
}

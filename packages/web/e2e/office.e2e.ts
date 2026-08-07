import type { Page } from '@playwright/test';

import { expect, test } from './helpers/harness';

/**
 * The office is a Phaser canvas with a React HUD overlay, loaded client-only.
 * Per Phase 10 Theme D we drive/assert the HUD + store-driven DOM, not pixels.
 * Proximity interactions (walking to the board room / library / coffee break)
 * need deterministic Phaser physics control and are left to a follow-up — they're
 * covered at the component level by the office-HUD stories (Phase 10 C2).
 */
/**
 * Both the 2D and the 3D controls hint end in "… E to interact", so a bare
 * `/to interact/i` matches whichever engine is mounted — and both at once
 * mid-swap. Match each engine's distinctive prefix instead.
 */
const HINT_2D = /arrows to move/i;
const HINT_3D = /click to look around/i;

/**
 * The office engine's canvas, scoped to the page body.
 *
 * A bare `page.locator('canvas')` also matches `<AppBackdrop>`'s decorative
 * canvas — mounted behind *every* `(main)` page whenever the appearance pattern
 * has a canvas twin (`starfield`, the `dynamic` patterns). That's one Settings →
 * Appearance click away at any time, so scope rather than rely on the default.
 */
const stageCanvas = (page: Page) => page.getByRole('main').locator('canvas');

test.describe('Office', () => {
  test('mounts the Phaser canvas and HUD against the live gateway', async ({ page }) => {
    await page.goto('/office');

    await expect(page.getByRole('heading', { name: 'Office', exact: true })).toBeVisible();

    // HUD overlay (React) renders regardless of the canvas; its controls hint is
    // always present.
    await expect(page.getByText(HINT_2D)).toBeVisible();

    // The online count comes from the live-data hook reading the gateway's
    // sessions. No agents are seeded, so the office is empty.
    await expect(page.getByText('0 agents online')).toBeVisible();

    // The Phaser game mounts a <canvas> into the stage (creation is deferred a
    // tick to dodge StrictMode double-mount, hence the generous timeout).
    await expect(stageCanvas(page)).toBeVisible({ timeout: 15_000 });
  });

  // Phase 63 Theme A — the 3D office behind the ?view=3d escape hatch. The r3f
  // scene mounts its own WebGL <canvas> + a click-to-lock overlay; the 2D office
  // stays the untouched default (no param, asserted above).
  test('?view=3d mounts the three.js world', async ({ page }) => {
    await page.goto('/office?view=3d');

    await expect(page.getByRole('heading', { name: 'Office', exact: true })).toBeVisible();
    // The pointer-lock hint is the 3D view's tell (the 2D HUD says "arrows to move").
    await expect(page.getByText(HINT_3D)).toBeVisible({ timeout: 15_000 });
    await expect(stageCanvas(page)).toBeVisible({ timeout: 15_000 });
  });

  // Phase 63 Theme G — flipping the 2D/3D tab strip must fully swap engines
  // (Phaser destroy ↔ three dispose) with no uncaught errors, and only one engine
  // mounted at a time. An uncaught exception during teardown is the tell that an
  // engine leaked or failed to dispose.
  test('2D↔3D tab toggle swaps engines cleanly', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/office');
    await expect(page.getByText(HINT_2D)).toBeVisible();
    await expect(stageCanvas(page)).toBeVisible({ timeout: 15_000 });

    // → 3D
    await page.getByRole('tab', { name: '3D' }).click();
    await expect(page.getByText(HINT_3D)).toBeVisible({ timeout: 15_000 });
    await expect(stageCanvas(page)).toBeVisible();

    // → back to 2D
    await page.getByRole('tab', { name: '2D' }).click();
    await expect(page.getByText(HINT_2D)).toBeVisible({ timeout: 15_000 });
    // The 3D-only pointer-lock hint is gone (its engine was torn down).
    await expect(page.getByText(HINT_3D)).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});

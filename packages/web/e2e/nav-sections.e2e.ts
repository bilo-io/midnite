import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

/**
 * Sidebar section grouping — the App / Agents / Overview collapsible categories
 * plus the settings feature chooser that mirrors them. Asserts the collapse
 * behaviour (headers toggle their children; state via `aria-expanded`) and
 * captures preview PNGs for the PR. No gateway seed needed — the nav + settings
 * render client-side from the (defaulted) settings blob.
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

async function setup(page: Page, navMode: 'expanded' | 'auto'): Promise<void> {
  await page.addInitScript((mode) => {
    try {
      localStorage.setItem('midnite.theme', 'dark');
      localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
      sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
      // reconcile() merges this over DEFAULT_SETTINGS, so a single field is safe.
      localStorage.setItem('midnite.settings', JSON.stringify({ navMode: mode }));
    } catch {
      /* best effort */
    }
  }, navMode);
}

const SECTIONS = ['App', 'Agents', 'Overview'] as const;

test('expanded rail groups features into collapsible sections', async ({ page }) => {
  await setup(page, 'expanded');
  await page.goto('/tasks');

  const nav = page.locator('aside nav').first();
  for (const label of SECTIONS) {
    await expect(nav.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  // A child link of the Agents section is visible while the section is open.
  await expect(nav.getByRole('link', { name: 'Sessions' })).toBeVisible();

  await page.locator('aside').first().screenshot({ path: join(OUT, 'nav-expanded-open.png') });

  // Collapsing a section animates its body to zero height (grid-rows 1fr→0fr +
  // overflow clip). Playwright still counts the clipped link's layout rect as
  // "visible", so assert the section container's collapsed height instead.
  const agentsBody = page.locator('#nav-section-agents');
  expect((await agentsBody.boundingBox())?.height ?? 0).toBeGreaterThan(40);

  const agents = nav.getByRole('button', { name: 'Agents', exact: true });
  await agents.click();
  await expect(agents).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(async () => (await agentsBody.boundingBox())?.height ?? 999).toBeLessThan(4);
  // A sibling section's children stay put.
  await expect(nav.getByRole('link', { name: 'Tasks' })).toBeVisible();

  await page
    .locator('aside')
    .first()
    .screenshot({ path: join(OUT, 'nav-expanded-agents-collapsed.png') });
});

test('collapsed rail shows a chevron toggle per section', async ({ page }) => {
  await setup(page, 'auto');
  await page.goto('/tasks');

  const nav = page.locator('aside nav').first();
  for (const label of SECTIONS) {
    await expect(nav.getByRole('button', { name: `${label} section` })).toBeVisible();
  }
  await page.locator('aside').first().screenshot({ path: join(OUT, 'nav-collapsed-rail.png') });
});

test('settings feature chooser mirrors the sidebar categories', async ({ page }) => {
  await setup(page, 'expanded');
  await page.goto('/settings/system');

  for (const label of SECTIONS) {
    await expect(page.getByRole('heading', { level: 3, name: label })).toBeVisible();
  }
  await page.screenshot({ path: join(OUT, 'settings-features-grouped.png'), fullPage: true });
});

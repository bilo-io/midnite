import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedProject } from './helpers/gateway';

// Phase 55 A/C/D — preview shots of the project detail cockpit (not baseline
// assertions): the two-rail layout with center tabs, in dark + light.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

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

for (const scheme of ['dark', 'light'] as const) {
  test(`project detail — cockpit (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const project = await seedProject(`Cockpit preview ${scheme}`, 'Ship the project detail page');
    await page.goto(`/projects/view?id=${project.id}`);

    await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
    await expect(page.getByText('Stats & actions')).toBeVisible();
    await expect(page.getByText('Sources & activity')).toBeVisible();
    await page.screenshot({ path: join(OUT, `projects-detail-${scheme}.png`), fullPage: true });
  });
}

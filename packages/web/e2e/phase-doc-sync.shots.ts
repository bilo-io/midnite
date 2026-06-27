import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedProject, seedRepo } from './helpers/gateway';

/**
 * Screenshot: the Phase 40 Theme G "Phase doc sync" section in the project modal —
 * the toggle + sync-repo picker that decides where seeded-task completions tick
 * checkboxes back. Opened via the `?open=<id>` deep-link (Theme D).
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    window.localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
  });
});

test('project modal shows the phase-doc sync controls', async ({ page }) => {
  await seedRepo(`e2e-sync-repo-${Date.now()}`, 'acme/widgets');
  const project = await seedProject(`E2E sync project ${Date.now()}`, 'Has phase-doc sync.');

  await page.goto(`/projects?open=${project.id}`);

  const modal = page.getByRole('dialog', { name: /Edit project/ });
  await expect(modal).toBeVisible();

  // The sync section lives at the bottom of the Details tab.
  const repoPicker = modal.getByLabel('Phase doc sync repo');
  await repoPicker.scrollIntoViewIfNeeded();
  await expect(repoPicker).toBeVisible();
  await expect(modal.getByText(/Tick phase-doc checkboxes as seeded tasks complete/)).toBeVisible();

  await page.waitForTimeout(500); // settle the modal entrance animation
  await page.screenshot({ path: resolve(OUT, 'project-phase-doc-sync.png') });
});

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { seedIdea } from './helpers/gateway';

/**
 * Promote idea → project (Phase 40 Theme D) against the live gateway. Proves the
 * full bridge: the PromoteModal creates a project, routes to it with the
 * "Created from idea" back-link, and the idea shows a project chip — all while
 * the idea persists (it's not archived).
 */
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

// Ideas is opt-in (off by default since Phase 40) — enable it, dismiss setup nudges.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('midnite.setup-nudge.dismissed', 'true');
    window.localStorage.setItem('midnite.setup-wizard.dismissed', 'true');
    window.localStorage.setItem('midnite.settings', JSON.stringify({ features: { ideas: true } }));
  });
});

test('promotes an idea to a project with a bidirectional link', async ({ page }) => {
  const idea = await seedIdea(`E2E promote idea ${Date.now()}`, 'A promising direction.');

  await page.goto(`/ideas/view?id=${idea.id}`);

  // Open the promote modal; the name is prefilled from the idea title.
  await page.getByRole('button', { name: /Promote to project/i }).click();
  const modal = page.getByRole('dialog', { name: /Promote idea to project/ });
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel('Project name')).toHaveValue(idea.title);
  await page.waitForTimeout(600); // let the modal's entrance animation settle for the capture
  await page.screenshot({ path: resolve(OUT, 'idea-promote-modal.png') });

  // Create → routed to /projects, where the `?open=` deep-link auto-opens the new
  // project's modal (the param is consumed + stripped on mount, so assert the
  // modal + its "Created from idea" badge rather than the transient URL).
  await modal.getByRole('button', { name: /Create project/i }).click();
  await expect(page.getByRole('link', { name: /Created from idea/i })).toBeVisible();
  await page.waitForTimeout(600); // let the project modal's entrance animation settle
  await page.screenshot({ path: resolve(OUT, 'project-from-idea-badge.png') });

  // The idea persists and now shows a project chip linking back.
  await page.goto(`/ideas/view?id=${idea.id}`);
  await expect(page.getByText('Promoted')).toBeVisible();
  await expect(page.getByRole('link', { name: idea.title })).toHaveAttribute(
    'href',
    /\/projects\/?\?open=/,
  );
});

import { expect, test } from '@playwright/test';

import { seedProject, type SeededProject } from './helpers/gateway';

// Phase 55 A/C/D — the shareable `/projects/view?id=` detail page. Direct
// navigation / refresh must render the full cockpit (output: 'export' can't
// prerender ids, so the id rides the query string and the view fetches it
// client-side); the projects-list cards navigate here; an unknown id shows an
// inline not-found, not a crash.
let project: SeededProject;

test.beforeAll(async () => {
  project = await seedProject('E2E project detail — cockpit', 'Ship the project detail page');
});

// The first-run setup wizard renders a modal overlay that would intercept clicks.
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

test.describe('Project detail page', () => {
  test('direct link renders the cockpit: tabs + both rails', async ({ page }) => {
    await page.goto(`/projects/view?id=${project.id}`);

    await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
    // Center tabs.
    for (const label of ['Details', 'Plan', 'Tasks', 'Phase docs']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
    // Both rails.
    await expect(page.getByText('Stats & actions')).toBeVisible();
    await expect(page.getByText('Sources & activity')).toBeVisible();

    // ?tab= drives the center panel and survives a reload.
    await page.getByRole('tab', { name: 'Tasks' }).click();
    await expect(page).toHaveURL(/tab=tasks/);
    await page.reload();
    await expect(page.getByRole('tab', { name: 'Tasks' })).toHaveAttribute('aria-selected', 'true');
  });

  test('a rail collapses to a slim toggle and re-expands', async ({ page }) => {
    await page.goto(`/projects/view?id=${project.id}`);
    await page.getByRole('button', { name: 'Collapse Stats & actions' }).click();
    await expect(page.getByRole('button', { name: 'Expand Stats & actions' })).toBeVisible();
    await page.getByRole('button', { name: 'Expand Stats & actions' }).click();
    await expect(page.getByRole('button', { name: 'Collapse Stats & actions' })).toBeVisible();
  });

  test('back affordance returns to the projects list', async ({ page }) => {
    await page.goto(`/projects/view?id=${project.id}`);
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/?$/);
  });

  test('an unknown id shows an inline not-found, not a crash', async ({ page }) => {
    await page.goto('/projects/view?id=does-not-exist');
    await expect(page.getByText('Project not found.')).toBeVisible();
  });

  test('a projects-list card navigates to the detail page (not a modal)', async ({ page }) => {
    await page.goto('/projects');
    await page.getByText(project.name).first().click();
    await expect(page).toHaveURL(new RegExp(`/projects/view/?\\?id=${project.id}`));
    await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
  });

  test('the legacy ?open= link redirects to the detail page', async ({ page }) => {
    await page.goto(`/projects?open=${project.id}`);
    await expect(page).toHaveURL(new RegExp(`/projects/view/?\\?id=${project.id}`));
  });
});

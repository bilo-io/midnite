import { expect, test } from './helpers/harness';

import { seedProject, uniqueLabel, type SeededProject } from './helpers/gateway';

// Phase 55 A/C/D — the shareable `/projects/view?id=` detail page. Direct
// navigation / refresh must render the full cockpit (output: 'export' can't
// prerender ids, so the id rides the query string and the view fetches it
// client-side); the projects-list cards navigate here; an unknown id shows an
// inline not-found, not a crash.
let project: SeededProject;

test.beforeAll(async () => {
  project = await seedProject(uniqueLabel('E2E project detail — cockpit'), 'Ship the project detail page');
});


test.describe('Project detail page', () => {
  test('direct link renders the cockpit: tabs + both rails', async ({ page }) => {
    await page.goto(`/projects/view?id=${project.id}`);

    await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
    // Center tabs. "Plan" became "Docs" (the view keeps a `?tab=plan → docs`
    // back-compat shim, but the control itself is gone), and "Roadmap" is new.
    for (const label of ['Details', 'Docs', 'Tasks', 'Roadmap']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
    // Both rails — the right one is "Knowledge & activity" now.
    await expect(page.getByText('Stats & actions')).toBeVisible();
    await expect(page.getByText('Knowledge & activity')).toBeVisible();

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

  // A loaded detail page deliberately has no back affordance any more: per
  // `page-header.tsx`, the desktop title bar owns history nav and the browser's
  // own back button covers the web case (Phase 81 follow-up). The `BackLink`
  // survives only in the loading / not-found branches, which have no header —
  // so it's asserted there, below, rather than on the loaded page.

  test('an unknown id shows an inline not-found and a way back, not a crash', async ({ page }) => {
    await page.goto('/projects/view?id=does-not-exist');
    // `ResourceNotFound`'s <h1> is the ICU message `{noun} not found` — no
    // trailing period, leading capital from `first-letter:uppercase` CSS.
    await expect(page.getByRole('heading', { name: 'project not found' })).toBeVisible();
    await page.getByRole('link', { name: 'All projects' }).click();
    await expect(page).toHaveURL(/\/projects\/?$/);
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

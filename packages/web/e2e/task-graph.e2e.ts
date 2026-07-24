import { expect, test } from '@playwright/test';

import { seedDependency, seedProject, seedTask, type SeededTask } from './helpers/gateway';

// Phase 58 B — the dependency DAG. Seed a blocker edge (dependent → blocker) so
// the graph has both nodes + an edge, then assert the view renders and a node
// click opens the shared task modal (`?task=`) without leaving the graph.
let blocker: SeededTask;
let dependent: SeededTask;
// Phase 58 C — a project with one done + one todo task, so its completion reads 1/2.
let graphProjectId: string;

test.beforeAll(async () => {
  [blocker, dependent] = await Promise.all([
    seedTask('E2E graph — blocker task', 'todo'),
    seedTask('E2E graph — dependent task', 'todo'),
  ]);
  await seedDependency(dependent.id, blocker.id);

  const project = await seedProject('E2E graph project', 'Graph completion');
  graphProjectId = project.id;
  await Promise.all([
    seedTask('E2E graph — project done', 'done', { projectId: graphProjectId }),
    seedTask('E2E graph — project todo', 'todo', { projectId: graphProjectId }),
  ]);
});

test.describe('Dependency graph', () => {
  test('renders the DAG nodes and the project filter', async ({ page }) => {
    await page.goto('/tasks/graph');

    await expect(page.getByRole('heading', { name: 'Dependency graph' })).toBeVisible();
    await expect(page.getByLabel('Filter graph by project')).toBeVisible();

    // Both seeded tasks appear as nodes.
    await expect(page.getByText(blocker.title)).toBeVisible();
    await expect(page.getByText(dependent.title)).toBeVisible();
  });

  test('clicking a node opens the task modal in place', async ({ page }) => {
    await page.goto('/tasks/graph');

    await page.getByText(dependent.title).click();

    // The `?task=` modal opens over the graph (still on /tasks/graph).
    await expect(page).toHaveURL(/\/tasks\/graph\?.*task=/);
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('is reachable from the Tasks page as a view mode', async ({ page }) => {
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Graph view' }).click();

    // Renders inline — no navigation to the standalone /tasks/graph route.
    // (`trailingSlash: true` means the URL is `/tasks/`, not `/tasks`.)
    await expect(page).toHaveURL(/\/tasks\/(?:\?.*)?$/);
    await expect(page.getByText(blocker.title)).toBeVisible();
    await expect(page.getByText(dependent.title)).toBeVisible();
  });

  test('shows per-project completion only when scoped to a project (Phase 58 C)', async ({ page }) => {
    // Unscoped: no completion indicator.
    await page.goto('/tasks/graph');
    await expect(page.getByRole('heading', { name: 'Dependency graph' })).toBeVisible();
    await expect(page.getByText(/^\d+\/\d+ · \d+%$/)).toHaveCount(0);

    // Scoped to the seeded project (1 done of 2) → 1/2 · 50%.
    await page.goto(`/tasks/graph?projectId=${graphProjectId}`);
    await expect(page.getByText('1/2 · 50%')).toBeVisible();
  });
});

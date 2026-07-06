import { expect, test } from '@playwright/test';

import { assignMilestone, seedMilestone, seedProject, seedTask } from './helpers/gateway';

// Phase 58 E — the roadmap tab: milestone lanes + backlog + assignment. Seed a
// project with a milestone and two project tasks (one already done), then drive
// the tab. dnd is exercised by unit tests (moveTaskLocal); the e2e covers the
// lanes rendering, the backlog, the progress numbers, and creating a milestone.
let projectId: string;

test.beforeAll(async () => {
  const project = await seedProject('Roadmap E2E project', 'Ship the roadmap');
  projectId = project.id;
  const milestone = await seedMilestone(projectId, 'Alpha milestone');
  // Two tasks in the project; assign both to the milestone so progress reads 1/2.
  const [t1, t2] = await Promise.all([
    seedTask('Roadmap E2E — shipped item', 'done', { projectId }),
    seedTask('Roadmap E2E — pending item', 'todo', { projectId }),
  ]);
  await Promise.all([t1, t2].map((t) => assignMilestone(t.id, milestone.id)));
  // One unassigned task → the backlog lane.
  await seedTask('Roadmap E2E — backlog item', 'todo', { projectId });
});

test.describe('Project roadmap', () => {
  test('renders milestone lanes, backlog, and progress', async ({ page }) => {
    await page.goto(`/projects/view?id=${projectId}&tab=roadmap`);

    await expect(page.getByRole('heading', { name: 'Alpha milestone' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Backlog' })).toBeVisible();
    await expect(page.getByText('Roadmap E2E — shipped item')).toBeVisible();
    await expect(page.getByText('Roadmap E2E — backlog item')).toBeVisible();
    // The milestone progress bar reports 1 of 2 done (50%).
    await expect(page.getByText('1/2 · 50%')).toBeVisible();
  });

  test('creates a milestone from the add-lane affordance', async ({ page }) => {
    await page.goto(`/projects/view?id=${projectId}&tab=roadmap`);
    await page.getByRole('button', { name: 'Add milestone' }).click();
    await page.getByLabel('New milestone name').fill('Beta milestone');
    await page.getByLabel('New milestone name').press('Enter');
    await expect(page.getByRole('heading', { name: 'Beta milestone' })).toBeVisible();
  });

  // Phase 58 F — the "View in graph" lane action deep-links to the DAG filtered to
  // the milestone; the graph shows a clearable milestone-filter chip.
  test('View in graph deep-links the dependency DAG to the milestone', async ({ page }) => {
    await page.goto(`/projects/view?id=${projectId}&tab=roadmap`);
    await page.getByRole('button', { name: 'Alpha milestone options' }).click();
    await page.getByRole('button', { name: 'View in graph' }).click();
    await expect(page).toHaveURL(/\/tasks\/graph\?.*milestoneId=/);
    await expect(page.getByRole('button', { name: /Clear milestone filter/ })).toBeVisible();
  });

  // Phase 58 F — the "Generate tasks…" lane action seeds the milestone from a goal.
  // The e2e gateway runs the LLM off, so the breakdown falls back to a single task
  // whose title is the goal text — deterministic to assert.
  test('Generate tasks seeds the milestone from a goal', async ({ page }) => {
    await page.goto(`/projects/view?id=${projectId}&tab=roadmap`);
    await page.getByRole('button', { name: 'Alpha milestone options' }).click();
    await page.getByRole('button', { name: 'Generate tasks…' }).click();

    const goal = 'E2E generated milestone task';
    await page.getByLabel(/Describe what this milestone/).fill(goal);
    await page.getByRole('button', { name: 'Draft tasks' }).click();
    await page.getByRole('button', { name: /Create \d+ task/ }).click();

    // The created task lands in the Alpha lane (modal closes, board refetches).
    await expect(page.getByText(goal)).toBeVisible();
  });
});

import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';
import { assignMilestone, seedDependency, seedMilestone, seedProject, seedTask } from './helpers/gateway';

// Phase 58 F — preview shots of the cross-links: the milestone chip on a board
// card, and the milestone-filter chip on the dependency graph. Dark theme.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);
let projectId: string;
let milestoneId: string;

test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  const project = await seedProject('Tie-in preview', 'Ship the tie-in');
  projectId = project.id;
  const milestone = await seedMilestone(projectId, 'Public launch');
  milestoneId = milestone.id;
  const [a, b] = await Promise.all([
    seedTask('Design the API', 'done', { projectId }),
    seedTask('Build the client', 'todo', { projectId }),
  ]);
  await seedDependency(b.id, a.id);
  await Promise.all([assignMilestone(a.id, milestoneId), assignMilestone(b.id, milestoneId)]);
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
  await page.emulateMedia({ colorScheme: 'dark' });
});

test('board card shows the milestone chip', async ({ page }) => {
  await page.goto('/tasks');
  await expect(page.getByText('Build the client').first()).toBeVisible();
  await expect(page.getByText('Public launch').first()).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, 'roadmap-tie-in-card-chip.png'), fullPage: true });
});

test('graph shows the milestone-filter chip', async ({ page }) => {
  await page.goto(`/tasks/graph?projectId=${projectId}&milestoneId=${milestoneId}`);
  await expect(page.getByRole('button', { name: /Clear milestone filter/ })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, 'roadmap-tie-in-graph-filter.png'), fullPage: true });
});

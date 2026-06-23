import { expect, test, type Page } from '@playwright/test';

import { GATEWAY_ORIGIN } from './config';

/**
 * Per-repo status widget (Phase 7 Theme C). Seed two repos + repo-assigned tasks
 * over the live gateway, mount the widget on the default dashboard tab (via its
 * localStorage key), and assert the rollup it renders.
 */
const WIDGETS_KEY = 'midnite.dashboard.widgets';

/** Create a repo; tolerate a 409 if a retried run already made it. */
async function ensureRepo(name: string): Promise<void> {
  const res = await fetch(`${GATEWAY_ORIGIN}/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, path: `~/e2e/${name}` }),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`ensureRepo(${name}) failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
}

/** Create a task in a given status, optionally assigned to a repo. */
async function seedRepoTask(prompt: string, status: string, repo?: string): Promise<void> {
  const form = new FormData();
  form.set('prompt', prompt);
  form.set('status', status);
  if (repo) form.set('repo', repo);
  const res = await fetch(`${GATEWAY_ORIGIN}/tasks`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`seedRepoTask failed (${res.status}): ${await res.text().catch(() => '')}`);
}

/** The per-repo WidgetCard, isolated by its title. */
function statusCard(page: Page) {
  return page.locator('div.rounded-xl').filter({ hasText: 'Per-repo status' });
}

test.describe('Per-repo status widget', () => {
  test('rolls tasks up per repo', async ({ page }) => {
    await ensureRepo('e2e-web');
    await ensureRepo('e2e-api');
    await Promise.all([
      seedRepoTask('e2e-web running', 'wip', 'e2e-web'),
      seedRepoTask('e2e-web queued', 'todo', 'e2e-web'),
      seedRepoTask('e2e-web shipped', 'done', 'e2e-web'),
      seedRepoTask('e2e-api queued a', 'todo', 'e2e-api'),
      seedRepoTask('e2e-api queued b', 'todo', 'e2e-api'),
      seedRepoTask('an unassigned one', 'todo'),
    ]);

    await page.addInitScript((key) => {
      window.localStorage.setItem(key, JSON.stringify([{ type: 'repo-status' }]));
    }, WIDGETS_KEY);
    await page.goto('/dashboard');

    const card = statusCard(page);
    await expect(card).toBeVisible();

    // e2e-web: 1 running, 1 queued, 1 done.
    const web = card.getByText('e2e-web').locator('xpath=ancestor::li');
    await expect(web.getByLabel('1 running')).toBeVisible();
    await expect(web.getByLabel('1 queued')).toBeVisible();
    await expect(web.getByLabel('1 done')).toBeVisible();

    // e2e-api: 0 running, 2 queued.
    const api = card.getByText('e2e-api').locator('xpath=ancestor::li');
    await expect(api.getByLabel('0 running')).toBeVisible();
    await expect(api.getByLabel('2 queued')).toBeVisible();

    // The no-repo task lands in the Unassigned bucket.
    await expect(card.getByText('Unassigned')).toBeVisible();
  });
});

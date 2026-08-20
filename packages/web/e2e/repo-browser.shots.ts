import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { SCREENSHOTS_DIR } from './config';

// Phase 84 Theme B — preview shots of the GitHub repo browser on Settings → Repos.
//
// `GET /github/repos` is stubbed rather than hit for real: the shots need all three
// checkout states side by side and the harness gateway has neither a GitHub token nor a
// deterministic set of clones on disk. Everything below the fetch — the annotation
// labels, the filters, the import affordances — is the component under the lens.
const OUT = resolve(process.cwd(), SCREENSHOTS_DIR);

const STUBBED_REPOS = {
  fetchedAt: '2026-08-20T09:00:00.000Z',
  cached: false,
  scannedRoots: ['~/Dev'],
  items: [
    {
      id: 1,
      name: 'midnite',
      ownerRepo: 'bilo-io/midnite',
      owner: 'bilo-io',
      private: false,
      fork: false,
      archived: false,
      defaultBranch: 'main',
      description: 'Multitask orchestrator for Claude Code',
      htmlUrl: 'https://github.com/bilo-io/midnite',
      pushedAt: '2026-08-20T08:00:00.000Z',
      localPath: '~/Dev/midnite',
      registeredRepoId: 'repo-1',
      checkoutState: 'registered',
    },
    {
      id: 2,
      name: 'midnite-ui',
      ownerRepo: 'bilo-io/midnite-ui',
      owner: 'bilo-io',
      private: false,
      fork: false,
      archived: false,
      defaultBranch: 'main',
      description: 'Public @bilo-io/ui + shell extraction',
      htmlUrl: 'https://github.com/bilo-io/midnite-ui',
      pushedAt: '2026-08-18T08:00:00.000Z',
      localPath: '~/Dev/midnite-ui',
      checkoutState: 'on-disk',
    },
    {
      id: 3,
      name: 'internal-tooling',
      ownerRepo: 'acme/internal-tooling',
      owner: 'acme',
      private: true,
      fork: false,
      archived: false,
      defaultBranch: 'main',
      description: 'Org repo the connection can see but this machine has never cloned',
      htmlUrl: 'https://github.com/acme/internal-tooling',
      pushedAt: '2026-08-11T08:00:00.000Z',
      checkoutState: 'not-checked-out',
    },
  ],
};

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

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

test('settings → repos offers the GitHub repo browser', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/settings/repos');
  const browse = page.getByRole('button', { name: /Browse my GitHub repos/i });
  await expect(browse).toBeVisible();
  // Shoot the Repos card, not the page: the settings panels reveal on scroll-in, and a
  // full-page capture races that staged fade to an empty frame.
  const card = page.locator('section, div').filter({ has: browse }).last();
  await expect(card).toHaveCSS('opacity', '1');
  await card.screenshot({ path: join(OUT, 'repo-browser-entry-dark.png') });
});

test('the browser labels all three checkout states', async ({ page }) => {
  await page.route('**/github/repos*', (route) =>
    route.fulfill({ json: STUBBED_REPOS, headers: { 'access-control-allow-origin': '*' } }),
  );

  for (const scheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/settings/repos');
    await page.getByRole('button', { name: /Browse my GitHub repos/i }).click();

    const dialog = page.getByRole('dialog', { name: /Your GitHub repositories/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Already registered')).toBeVisible();
    await expect(dialog.getByText('On disk at ~/Dev/midnite-ui')).toBeVisible();
    await expect(dialog.getByText('Not checked out locally')).toBeVisible();

    await dialog.screenshot({ path: join(OUT, `repo-browser-states-${scheme}.png`) });
  }
});

test('the browser prompts to connect rather than erroring', async ({ page }) => {
  await page.route('**/github/repos*', (route) =>
    route.fulfill({
      status: 409,
      json: { statusCode: 409, code: 'github_not_connected', message: 'no GitHub connection' },
      headers: { 'access-control-allow-origin': '*' },
    }),
  );

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/settings/repos');
  await page.getByRole('button', { name: /Browse my GitHub repos/i }).click();

  const dialog = page.getByRole('dialog', { name: /Your GitHub repositories/i });
  await expect(dialog.getByText('GitHub is not connected')).toBeVisible();
  await dialog.screenshot({ path: join(OUT, 'repo-browser-not-connected-dark.png') });
});

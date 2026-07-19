import { expect, test, type Page } from '@playwright/test';

// Admin talks to the gateway directly over HTTP, so these flow specs stub the two
// reads the gate depends on — `GET /auth/me` (session) and the operator-gated
// `GET /admin/overview` (the operator probe) — via route interception. No real
// gateway is required. (Authoring-only: this needs the dev server + browser, so
// it's out of `moon ci`; run with `moon run admin:e2e`.)

const FAKE_USER = {
  id: 'usr_0000000000000000',
  email: 'operator@example.com',
  name: 'Ada Operator',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const FAKE_OVERVIEW = {
  users: 3,
  teams: 1,
  projects: 2,
  tasks: { todo: 1, wip: 0, waiting: 0, done: 4, backlog: 0, abandoned: 0 },
  activeSessions: 0,
  costUsd: 12.5,
};

/** Stub the session read as a signed-in user, and the SSO providers as empty. */
async function stubSession(page: Page): Promise<void> {
  await page.route('**/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: FAKE_USER }) }),
  );
  await page.route('**/auth/sso/providers', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: [] }) }),
  );
}

test('non-operator sees the operator-gate placeholder', async ({ page }) => {
  await stubSession(page);
  // 403 from the operator probe ⇒ signed-in, but not an operator.
  await page.route('**/admin/overview', (route) =>
    route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Forbidden' }) }),
  );

  await page.goto('/');

  await expect(page.getByText(/isn.t an operator/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
});

test('operator navigates the rail routes', async ({ page }) => {
  await stubSession(page);
  // 200 from the probe ⇒ operator; also back the Overview read.
  await page.route('**/admin/overview', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_OVERVIEW) }),
  );

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

  for (const [label, heading] of [
    ['Usage', 'Usage'],
    ['Users & teams', 'Users & teams'],
    ['Projects', 'Projects'],
    ['Versions', 'Versions'],
    ['Audit', 'Audit'],
    ['Links', 'Links'],
  ] as const) {
    await page.getByRole('link', { name: label }).first().click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

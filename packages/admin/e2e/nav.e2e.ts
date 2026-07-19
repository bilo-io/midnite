import { expect, test, type Page } from '@playwright/test';

import { GATEWAY_ORIGIN } from './config';

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

// ── Theme F page content (route-intercepted; no real gateway) ─────────────────

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const FAKE_USAGE_SUMMARY = {
  from: '2026-06-19T00:00:00.000Z',
  to: null,
  groupBy: 'day',
  totals: { calls: 42, inputTokens: 12_000, outputTokens: 8000, estCostUsd: 3.21 },
  buckets: [],
  byProvider: [{ key: 'anthropic', calls: 42, inputTokens: 12_000, outputTokens: 8000, estCostUsd: 3.21 }],
  byFeature: [],
  byDay: [
    { key: '2026-07-18', calls: 20, inputTokens: 6000, outputTokens: 4000, estCostUsd: 1.6 },
    { key: '2026-07-19', calls: 22, inputTokens: 6000, outputTokens: 4000, estCostUsd: 1.61 },
  ],
  warnings: [],
  costIsEstimate: true,
  composition: { llmUsd: 3.21, sessionMeasuredUsd: 5.0, sessionEstimatedUsd: 0, unpricedSessions: 0 },
};

const FAKE_ATTRIBUTION = {
  from: '2026-06-19T00:00:00.000Z',
  to: null,
  groupBy: 'repo',
  totals: {
    sessions: 3,
    inputTokens: 9000,
    outputTokens: 6000,
    cachedTokens: 0,
    estCostUsd: 5.0,
    measuredCostUsd: 5.0,
    estimatedCostUsd: 0,
    unpricedSessions: 0,
  },
  buckets: [
    {
      key: 'midnite',
      label: 'midnite',
      sessions: 3,
      inputTokens: 9000,
      outputTokens: 6000,
      cachedTokens: 0,
      estCostUsd: 5.0,
      measuredCostUsd: 5.0,
      estimatedCostUsd: 0,
      unpricedSessions: 0,
    },
  ],
};

const FAKE_OPS = {
  gauges: { queueDepth: 0, slotsUsed: 0, slotsTotal: 4, lastTickLatencyMs: 5, updatedAt: null },
  throughputByDay: [],
  durationBuckets: { lt1s: 0, lt5s: 0, lt30s: 1, lt2m: 2, gte2m: 0 },
  outcomeCounts: { done: 4, abandoned: 1, failed: 0, cancelled: 0 },
};

const FAKE_CYCLE = {
  from: '2026-06-19T00:00:00.000Z',
  to: '2026-07-19T00:00:00.000Z',
  groupBy: 'none',
  groups: [
    {
      key: 'all',
      taskCount: 4,
      wait: { p50Ms: 1000, p90Ms: 2000, count: 4 },
      work: { p50Ms: 60_000, p90Ms: 120_000, count: 4 },
      endToEnd: { p50Ms: 65_000, p90Ms: 130_000, count: 4 },
      retryOverheadMsTotal: 0,
      tasksWithRetries: 0,
    },
  ],
};

const FAKE_USERS = [
  {
    id: 'usr_0000000000000001',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    createdAt: '2026-01-01T00:00:00.000Z',
    teamCount: 1,
  },
  {
    id: 'usr_0000000000000002',
    email: 'grace@example.com',
    name: 'Grace Hopper',
    createdAt: '2026-02-01T00:00:00.000Z',
    teamCount: 0,
  },
];

const FAKE_TEAMS = [
  { id: 'team_0000000000000001', slug: 'core', name: 'Core', createdAt: '2026-01-01T00:00:00.000Z', memberCount: 1 },
];

const FAKE_AUDIT = {
  entries: [
    {
      id: 'aud_0000000000000001',
      entityType: 'task',
      entityId: 'tsk_1',
      userId: 'usr_0000000000000001',
      action: 'task.created',
      payload: { title: 'Do the thing' },
      createdAt: '2026-07-18T12:00:00.000Z',
    },
    {
      id: 'aud_0000000000000002',
      entityType: 'team',
      entityId: 'team_0000000000000001',
      userId: null,
      action: 'team.created',
      payload: null,
      createdAt: '2026-07-17T09:30:00.000Z',
    },
  ],
  total: 2,
};

/**
 * Back every gateway read the Theme F pages issue (operator session assumed).
 * Routes are scoped to the GATEWAY origin so an API glob (e.g. `/audit`) never
 * captures the admin app's same-named *page* navigation on the app origin.
 */
async function stubGateway(page: Page): Promise<void> {
  await stubSession(page);
  await page.route(`${GATEWAY_ORIGIN}/admin/overview`, (route) => route.fulfill(json(FAKE_OVERVIEW)));
  await page.route(`${GATEWAY_ORIGIN}/admin/users`, (route) => route.fulfill(json(FAKE_USERS)));
  await page.route(`${GATEWAY_ORIGIN}/admin/teams`, (route) => route.fulfill(json(FAKE_TEAMS)));
  await page.route(`${GATEWAY_ORIGIN}/usage/summary**`, (route) => route.fulfill(json(FAKE_USAGE_SUMMARY)));
  await page.route(`${GATEWAY_ORIGIN}/usage/attribution**`, (route) => route.fulfill(json(FAKE_ATTRIBUTION)));
  await page.route(`${GATEWAY_ORIGIN}/metrics/ops**`, (route) => route.fulfill(json(FAKE_OPS)));
  await page.route(`${GATEWAY_ORIGIN}/metrics/cycle-time**`, (route) => route.fulfill(json(FAKE_CYCLE)));
  await page.route(`${GATEWAY_ORIGIN}/audit**`, (route) => route.fulfill(json(FAKE_AUDIT)));
}

test('Overview renders KPIs from the stubbed reads', async ({ page }) => {
  await stubGateway(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  // KPI tiles from /admin/overview.
  await expect(page.getByText('Users', { exact: true })).toBeVisible();
  await expect(page.getByText('Spend (all-time)')).toBeVisible();
  // Recent-activity strip from /audit.
  await expect(page.getByText(/created a task/i).first()).toBeVisible();
});

test('Usage renders spend + attribution from stubs', async ({ page }) => {
  await stubGateway(page);
  await page.goto('/usage');

  await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible();
  await expect(page.getByText('Total spend')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cost attribution' })).toBeVisible();
  // The one attribution bucket ("midnite") appears in the table.
  await expect(page.getByRole('cell', { name: 'midnite' })).toBeVisible();
});

test('Users lists stubbed users and a team rename fires the PATCH', async ({ page }) => {
  await stubGateway(page);
  let patched = false;
  await page.route(`${GATEWAY_ORIGIN}/teams/team_0000000000000001`, (route) => {
    if (route.request().method() === 'PATCH') {
      patched = true;
      return route.fulfill(
        json({ id: 'team_0000000000000001', slug: 'core', name: 'Core Team', createdBy: 'usr_x', createdAt: '2026-01-01T00:00:00.000Z' }),
      );
    }
    return route.continue();
  });

  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Users & teams' })).toBeVisible();
  await expect(page.getByText('ada@example.com')).toBeVisible();

  // Switch to Teams, rename the one team.
  await page.getByRole('tab', { name: /Teams/ }).click();
  await expect(page.getByText('Core', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByLabel('New team name').fill('Core Team');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect.poll(() => patched).toBe(true);
});

test('Audit renders stubbed rows and applies a filter', async ({ page }) => {
  await stubGateway(page);
  await page.goto('/audit');

  await expect(page.getByRole('heading', { name: 'Audit' })).toBeVisible();
  await expect(page.getByText(/created a task/i).first()).toBeVisible();

  // The entity filter is present and selectable (drives a re-query via the key).
  await expect(page.getByLabel('Filter by entity')).toBeVisible();
  await expect(page.getByText('1–2 of 2')).toBeVisible();
});

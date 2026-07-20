import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@midnite/ui/theme';
import type {
  AdminTeamSummary,
  AdminUserSummary,
  AuditListResponse,
  CycleTimeResponse,
  OpsSummary,
  PlatformOverview,
  ProjectsPage,
  UsageAttributionResponse,
  UsageSummaryResponse,
  VersionManifest,
} from '@midnite/shared';
import * as api from '@/lib/api';
import { VersionsView } from '@/components/versions-view';
import OverviewPage from './page';
import UsagePage from './usage/page';
import UsersPage from './users/page';
import ProjectsPage from './projects/page';
import AuditPage from './audit/page';
import LinksPage from './links/page';

// Admin sections are pure HTTP clients of the gateway: each page fans a few
// `@/lib/api` reads into TanStack Query. These specs spy those reads and assert
// each section renders its heading + a representative datum from the mocked
// response (happy path), plus Overview's loading + error beats. Query by
// role/label, never test-ids (CLAUDE.md).

// ── Schema-valid fixtures (shapes mirror the seeded e2e fixtures) ─────────────

const OVERVIEW: PlatformOverview = {
  users: 3,
  teams: 1,
  projects: 2,
  tasks: { backlog: 0, todo: 1, wip: 0, waiting: 0, done: 4, abandoned: 0 },
  activeSessions: 0,
  costUsd: 12.5,
};

const USAGE_SUMMARY: UsageSummaryResponse = {
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
  composition: { llmUsd: 3.21, sessionMeasuredUsd: 5, sessionEstimatedUsd: 0, unpricedSessions: 0 },
};

const ATTRIBUTION: UsageAttributionResponse = {
  from: '2026-06-19T00:00:00.000Z',
  to: null,
  groupBy: 'repo',
  totals: {
    sessions: 3,
    inputTokens: 9000,
    outputTokens: 6000,
    cachedTokens: 0,
    estCostUsd: 5,
    measuredCostUsd: 5,
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
      estCostUsd: 5,
      measuredCostUsd: 5,
      estimatedCostUsd: 0,
      unpricedSessions: 0,
    },
  ],
};

const OPS: OpsSummary = {
  gauges: { queueDepth: 0, slotsUsed: 0, slotsTotal: 4, lastTickLatencyMs: 5, updatedAt: null },
  throughputByDay: [],
  durationBuckets: { lt1s: 0, lt5s: 0, lt30s: 1, lt2m: 2, gte2m: 0 },
  outcomeCounts: { done: 4, abandoned: 1, failed: 0, cancelled: 0 },
};

const CYCLE: CycleTimeResponse = {
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

const USERS: AdminUserSummary[] = [
  { id: 'usr_1', email: 'ada@example.com', name: 'Ada Lovelace', createdAt: '2026-01-01T00:00:00.000Z', teamCount: 1 },
];

const TEAMS: AdminTeamSummary[] = [
  { id: 'team_1', slug: 'core', name: 'Core', createdAt: '2026-01-01T00:00:00.000Z', memberCount: 1 },
];

const PROJECTS: ProjectsPage = {
  total: 1,
  items: [
    {
      id: 'prj_1',
      name: 'Aurora',
      tag: 'aurora',
      color: '#7c3aed',
      description: 'The flagship initiative.',
      workDir: '~/dev/aurora',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      taskStatusCounts: { todo: 2, wip: 1, done: 7 },
    },
  ],
};

const AUDIT: AuditListResponse = {
  total: 2,
  entries: [
    {
      id: 'aud_1',
      entityType: 'task',
      entityId: 'tsk_1',
      userId: 'usr_1',
      action: 'task.created',
      payload: { title: 'Do the thing' },
      createdAt: '2026-07-18T12:00:00.000Z',
    },
    {
      id: 'aud_2',
      entityType: 'team',
      entityId: 'team_1',
      userId: null,
      action: 'team.created',
      payload: null,
      createdAt: '2026-07-17T09:30:00.000Z',
    },
  ],
};

const MANIFEST: VersionManifest = {
  version: '0.3.0',
  channel: 'stable',
  minSupported: '0.1.0',
  releasedAt: '2026-07-15T00:00:00.000Z',
  notesUrl: 'https://github.com/bilo-io/midnite-app/releases/tag/v0.3.0',
};

function renderPage(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Overview section', () => {
  it('renders KPIs + recent activity from the mocked reads', async () => {
    vi.spyOn(api, 'getAdminOverview').mockResolvedValue(OVERVIEW);
    vi.spyOn(api, 'getUsageSummary').mockResolvedValue(USAGE_SUMMARY);
    vi.spyOn(api, 'getAudit').mockResolvedValue(AUDIT);

    renderPage(<OverviewPage />);

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    // KPI tile + recent-activity strip, both from query data.
    expect(await screen.findByText('Spend (all-time)')).toBeInTheDocument();
    expect(await screen.findByText(/created a task/i)).toBeInTheDocument();
  });

  it('shows a loading state while the reads are in flight', () => {
    vi.spyOn(api, 'getAdminOverview').mockReturnValue(new Promise(() => {}));
    vi.spyOn(api, 'getUsageSummary').mockReturnValue(new Promise(() => {}));
    vi.spyOn(api, 'getAudit').mockReturnValue(new Promise(() => {}));

    renderPage(<OverviewPage />);

    expect(screen.getAllByRole('status', { name: 'Loading' }).length).toBeGreaterThan(0);
  });

  it('shows an inline error when the overview read fails', async () => {
    vi.spyOn(api, 'getAdminOverview').mockRejectedValue(new Error('boom'));
    vi.spyOn(api, 'getUsageSummary').mockResolvedValue(USAGE_SUMMARY);
    vi.spyOn(api, 'getAudit').mockResolvedValue(AUDIT);

    renderPage(<OverviewPage />);

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((el) => el.textContent?.includes('boom'))).toBe(true);
  });
});

describe('Usage section', () => {
  it('renders spend KPIs + the attribution table', async () => {
    vi.spyOn(api, 'getUsageSummary').mockResolvedValue(USAGE_SUMMARY);
    vi.spyOn(api, 'getUsageAttribution').mockResolvedValue(ATTRIBUTION);
    vi.spyOn(api, 'getOpsSummary').mockResolvedValue(OPS);
    vi.spyOn(api, 'getCycleTime').mockResolvedValue(CYCLE);

    renderPage(<UsagePage />);

    expect(await screen.findByRole('heading', { name: 'Usage' })).toBeInTheDocument();
    expect(await screen.findByText('Total spend')).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'midnite' })).toBeInTheDocument();
  });
});

describe('Users section', () => {
  it('lists platform users from the mocked read', async () => {
    vi.spyOn(api, 'getAdminUsers').mockResolvedValue(USERS);
    vi.spyOn(api, 'getAdminTeams').mockResolvedValue(TEAMS);

    renderPage(<UsersPage />);

    expect(await screen.findByRole('heading', { name: 'Users & teams' })).toBeInTheDocument();
    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
  });
});

describe('Projects section', () => {
  it('lists projects from the mocked read', async () => {
    vi.spyOn(api, 'getProjects').mockResolvedValue(PROJECTS);

    renderPage(<ProjectsPage />);

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /Aurora/ })).toBeInTheDocument();
  });
});

describe('Audit section', () => {
  it('renders audit rows from the mocked read', async () => {
    vi.spyOn(api, 'getAudit').mockResolvedValue(AUDIT);

    renderPage(<AuditPage />);

    expect(await screen.findByRole('heading', { name: 'Audit' })).toBeInTheDocument();
    expect(await screen.findByText('tsk_1')).toBeInTheDocument();
    expect(await screen.findByText('1–2 of 2')).toBeInTheDocument();
  });
});

describe('Versions section', () => {
  it('renders the running build, the stable channel, and the changelog', async () => {
    vi.spyOn(api, 'fetchVersionManifest').mockImplementation(async (channel) => {
      if (channel === 'beta') throw new api.ApiError('not published', 404);
      return MANIFEST;
    });

    renderPage(<VersionsView changelog={'# Changelog\n\n## 0.3.0\n\n- A note.'} />);

    expect(await screen.findByRole('heading', { name: 'Versions' })).toBeInTheDocument();
    expect(screen.getByText('Running build', { exact: true })).toBeInTheDocument();
    // The stable manifest's version renders once the read resolves.
    expect(await screen.findByText('0.3.0')).toBeInTheDocument();
    // Beta 404s → the fail-soft message, not a crash.
    expect(await screen.findByText('No beta manifest published.')).toBeInTheDocument();
  });
});

describe('Links section', () => {
  it('renders the outbound (incl. Web app) + in-app launcher cards', () => {
    renderPage(<LinksPage />);

    expect(screen.getByRole('heading', { name: 'Links' })).toBeInTheDocument();
    // The Web app card (Phase 73 G) opens the deployed app in a new tab.
    const webApp = screen.getByRole('link', { name: /Web app/ });
    expect(webApp).toHaveAttribute('target', '_blank');
    expect(webApp).toHaveAttribute('rel', expect.stringContaining('noopener'));
    // An in-app deep link into an operator surface.
    expect(screen.getAllByRole('link', { name: /Usage/ }).length).toBeGreaterThan(0);
  });
});

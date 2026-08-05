import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';

import { renderWithIntl } from '@/vitest.render-intl';
import { withQueryClient } from '@/lib/test-query-wrapper';

/**
 * Phase 82 Theme D (dashboard round 2) — behavioural fr-FR renders.
 *
 * `lib/i18n-dashboard-registry.test.ts` proves the keys *resolve*; these mount widgets
 * under `fr-FR` and assert the French reaches the DOM. The cases are chosen for the
 * classes of copy the `jsx-text-only` gate structurally cannot see, since those are the
 * ones a green lint run says nothing about:
 *
 * - a **card header** sourced from the widget catalog rather than a `title="…"` literal
 * - an **aria-label** (the refresh buttons, the chart `role="img"` descriptions)
 * - a **registry table** (weather codes, cycle-time group-by, LLM features)
 * - a **unit suffix + number** rendered through `useUnitFormat` (`5,2 min`, `42,0 Go`)
 * - an **ICU plural** inside a chart footnote
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api', () => ({
  getTaskActivity: vi.fn(async () => [
    { taskId: 't1', title: 'Corriger la connexion', kind: 'task.details.changed', at: new Date().toISOString() },
  ]),
  getCycleTime: vi.fn(async () => ({
    groups: [
      {
        key: 'fleet',
        taskCount: 4,
        retryOverheadMsTotal: 65_000,
        tasksWithRetries: 2,
        wait: { p50Ms: 5_200, p90Ms: 9_000 },
        work: { p50Ms: 61_000, p90Ms: 120_000 },
        endToEnd: { p50Ms: 66_000, p90Ms: 130_000 },
      },
    ],
  })),
  getWeather: vi.fn(async () => ({
    current: { temperatureC: 18, weatherCode: 3 },
    today: { lowC: 11, highC: 21, precipitationProbability: 40 },
  })),
  getUsageSummary: vi.fn(async () => ({
    warnings: [],
    totals: { estCostUsd: 2.5, calls: 1 },
    byDay: [],
    byProvider: [{ key: 'anthropic', estCostUsd: 2.5 }],
    byFeature: [{ key: 'classifier', estCostUsd: 2.5 }],
  })),
}));

vi.mock('@/lib/use-system-stats', () => ({
  useSystemStats: () => ({
    stats: { disks: [{ path: '/', usedBytes: 45_097_156_608, totalBytes: 494_384_795_648 }] },
    loading: false,
    error: null,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('Phase 82 D — dashboard widgets render fr-FR', () => {
  // The header is the slice's central claim: it comes from `dashboard.catalog.<type>.label`
  // (a prop string the gate can't see), so French here proves the seam is wired.
  it('titles the activity card from the widget catalog and names the event kind', async () => {
    const { ActivityWidget } = await import('./activity-widget');
    renderWithIntl(withQueryClient(<ActivityWidget />), { locale: 'fr-FR' });

    expect(screen.getByText('Fil d’activité')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualiser l’activité' })).toBeInTheDocument();
    // `task.details.changed` → the allowlist entry, not `humanizeKind()`'s English.
    await waitFor(() => expect(screen.getByText('Détails modifiés')).toBeInTheDocument());
  });

  it('renders the cycle-time chart chrome, group-by registry and plural footnote in French', async () => {
    const { CycleTimeWidget } = await import('./cycle-time-widget');
    renderWithIntl(
      withQueryClient(<CycleTimeWidget config={{ windowDays: 7, groupBy: 'none' }} onConfigChange={vi.fn()} />),
      { locale: 'fr-FR' },
    );

    expect(screen.getByText('Temps de cycle')).toBeInTheDocument();
    // The group-by table, previously a module-level English `Record`.
    expect(screen.getByRole('option', { name: 'Flotte' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Par dépôt' })).toBeInTheDocument();
    // The chart's accessible description — an aria-label, invisible to the gate. It only
    // mounts once the metrics resolve, so this is the wait the rest hangs off.
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Graphique du temps de cycle' })).toBeInTheDocument(),
    );
    // ICU plural + a `useUnitFormat` duration: 65s → `1,1 min` with a French decimal comma.
    expect(screen.getByText(/2 tâches/)).toBeInTheDocument();
    expect(screen.getByText(/1,1 min/)).toBeInTheDocument();
  });

  it('names the weather condition from the shared code registry', async () => {
    const { WeatherWidget } = await import('./weather-widget');
    renderWithIntl(
      withQueryClient(
        <WeatherWidget config={{ units: 'c', location: { lat: 48.85, lon: 2.35 } }} onConfigChange={vi.fn()} />,
      ),
      { locale: 'fr-FR' },
    );
    // WMO code 3 → the `overcast` bucket, shared with the landing-page variant.
    await waitFor(() => expect(screen.getByText('Couvert')).toBeInTheDocument());
    expect(screen.getByLabelText('Probabilité de précipitations')).toBeInTheDocument();
  });

  it('formats disk bytes with French units and decimal comma', async () => {
    const { DiskWidget } = await import('./disk-widget');
    renderWithIntl(<DiskWidget />, { locale: 'fr-FR' });

    expect(screen.getByText('Disque')).toBeInTheDocument();
    // 42 GiB used of 460 GiB — `Go`, not `GB`, and `42,0` not `42.0`. This is the
    // `RadialGauge` `labels.bytes` formatter the slice added to `@midnite/ui`.
    expect(screen.getByText('42,0 Go')).toBeInTheDocument();
  });

  it('translates the LLM feature axis but leaves provider brand names alone', async () => {
    const { UsageWidget } = await import('./usage-widget');
    renderWithIntl(withQueryClient(<UsageWidget />), { locale: 'fr-FR' });

    await waitFor(() => expect(screen.getByText('Par fonction')).toBeInTheDocument());
    // `classifier` → catalog wording…
    expect(screen.getByText('Tri des tâches')).toBeInTheDocument();
    // …while `anthropic` stays the brand, deliberately un-seamed.
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
  });

  it('names the count tiles from the catalog and their hints from the tile subtree', async () => {
    const { DashboardTiles } = await import('./dashboard-tiles');
    renderWithIntl(<DashboardTiles counts={{ backlog: 2, todo: 1, inProgress: 0, done: 5 }} />, {
      locale: 'fr-FR',
    });

    // `Backlog` is the catalog's fr label (the term is kept as-is in French dev usage);
    // the *hint* is this slice's new copy, so it's the one that proves the wiring.
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('En attente ou à clarifier')).toBeInTheDocument();
    expect(screen.getByText('Terminées')).toBeInTheDocument();
  });
});

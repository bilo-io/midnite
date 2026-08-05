import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import type { ApprovalLogEntry } from '@midnite/shared';

import { renderWithIntl } from '@/vitest.render-intl';
import { withQueryClient } from '@/lib/test-query-wrapper';

/**
 * Phase 82 Theme D (ops slice) — behavioural fr-FR renders.
 *
 * `lib/i18n-ops-registry.test.ts` proves the keys *resolve*; these assert the French
 * reaches the DOM, chosen for the two things this slice got structurally right and the one
 * bug it fixed:
 *
 * - a **card heading** from `ops.cards.<type>.title`, which is where the ops board differs
 *   from the dashboard: the heading deliberately says more than the picker entry
 *   (`Débit (enregistré côté serveur)` vs the catalog's `Débit`), so both must render.
 * - the **Decisions resolution column**, whose old English map keyed on values absent from
 *   `ApprovalResolutionSchema` — `allow-session` used to render the raw string.
 * - a **`useUnitFormat` duration** through the ops charts (`1,5 min`, comma included).
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/ops',
  useSearchParams: () => new URLSearchParams(),
}));

const listApprovalLog = vi.fn();
vi.mock('@/lib/api', () => ({
  listApprovalLog: (...args: unknown[]) => listApprovalLog(...args),
  getPreflight: vi.fn(async () => ({ checks: [{ name: 'repo-paths', status: 'warn', detail: 'no repos', remedy: 'add one' }] })),
  getReadiness: vi.fn(async () => ({ ready: true, uptimeMs: 3 * 86_400_000 + 4 * 3_600_000, checks: [] })),
}));

function entry(partial: Partial<ApprovalLogEntry> = {}): ApprovalLogEntry {
  return {
    id: 'a1',
    sessionId: 's1',
    taskId: 't1',
    toolName: 'Bash',
    summary: 'rm -rf build',
    resolution: 'allow-session',
    ruleId: null,
    decidedBy: 'user',
    createdAt: new Date().toISOString(),
    ...partial,
  } as ApprovalLogEntry;
}

afterEach(cleanup);

describe('Phase 82 D — ops board renders fr-FR', () => {
  it('gives the throughput card its fuller heading, distinct from the catalog entry', async () => {
    const { ThroughputSection } = await import('./ops-view');
    renderWithIntl(
      <ThroughputSection summary={{ throughputByDay: [{ day: '2026-08-01', count: 3 }] } as never} loading={false} />,
      { locale: 'fr-FR' },
    );
    // `ops.cards.throughput.title` — not `ops.catalog.throughput.label` ("Débit").
    expect(screen.getByText('Débit (enregistré côté serveur)')).toBeInTheDocument();
    expect(screen.getByText('exécutions sur la période')).toBeInTheDocument();
    expect(screen.getByLabelText('Graphique à barres du débit')).toBeInTheDocument();
  });

  it('labels the live-fleet stat rows and the slot-bar aria in French', async () => {
    const { GaugesSection } = await import('./ops-view');
    renderWithIntl(
      <GaugesSection
        pool={{ busy: 2, capacity: 4, queuedTodo: 1 } as never}
        summary={{ gauges: { queueDepth: 5, lastTickLatencyMs: 12 } } as never}
        loading={false}
      />,
      { locale: 'fr-FR' },
    );
    expect(screen.getByText('État de la flotte en direct')).toBeInTheDocument();
    expect(screen.getByText('Utilisation des emplacements')).toBeInTheDocument();
    expect(screen.getByText('sur 4 emplacements')).toBeInTheDocument();
    expect(screen.getByText('latence de l’ordonnanceur')).toBeInTheDocument();
    // The progress-bar aria template — invisible to the gate.
    expect(screen.getByRole('progressbar', { name: '2 emplacements utilisés sur 4' })).toBeInTheDocument();
  });

  it('names run outcomes in French on the outcomes breakdown', async () => {
    const { OutcomesSection } = await import('./ops-view');
    renderWithIntl(
      <OutcomesSection
        summary={{ outcomeCounts: { done: 3, abandoned: 1, failed: 2, cancelled: 0 } } as never}
        loading={false}
      />,
      { locale: 'fr-FR' },
    );
    expect(screen.getByText('Terminées')).toBeInTheDocument();
    expect(screen.getByText('Abandonnées')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'En échec : 2' })).toBeInTheDocument();
  });

  // The bug: the old map keyed on `approved`/`denied`/`error`, so `allow-session` fell
  // through its `??` and rendered the raw enum value in *every* locale.
  it('renders the approval resolution from the shared enum, not a stale English map', async () => {
    listApprovalLog.mockResolvedValue({ entries: [entry()], total: 1 });
    const { DecisionsSection } = await import('./ops-view');
    renderWithIntl(withQueryClient(<DecisionsSection />), { locale: 'fr-FR' });

    await waitFor(() => expect(screen.getByText('Autorisé (session)')).toBeInTheDocument());
    expect(screen.queryByText('allow-session')).not.toBeInTheDocument();
    expect(screen.getByText('Utilisateur')).toBeInTheDocument();
    expect(screen.getByText('Outil / résumé')).toBeInTheDocument();
  });

  it('formats runtime-health uptime and preflight status words in French', async () => {
    const { RuntimeHealthPanel } = await import('./runtime-health-panel');
    renderWithIntl(withQueryClient(<RuntimeHealthPanel />), { locale: 'fr-FR' });

    // The heading renders immediately; the readiness pill waits on the poll, so that's
    // the signal to hang the rest off.
    await waitFor(() => expect(screen.getByText('Prêt')).toBeInTheDocument());
    expect(screen.getByText('Santé du runtime')).toBeInTheDocument();
    // 3d 4h through `useUnitFormat().age` — French spells the units and spaces them.
    expect(screen.getByText('3 j 4 h')).toBeInTheDocument();
    expect(screen.getByText('Alerte')).toBeInTheDocument();
  });
});

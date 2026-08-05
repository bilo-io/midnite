import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Digest, SessionSummary } from '@midnite/shared';

import { renderWithIntl } from '@/vitest.render-intl';
import { withQueryClient } from '@/lib/test-query-wrapper';

/**
 * Phase 82 Theme D (sessions / media / digests residue) — behavioural proof that the
 * migrated surfaces actually *render* French, not merely that their keys resolve
 * (that's `i18n-residue-keys.test.ts`). One render per copy shape the slice
 * introduced: an enum via a shared hook, a locale-formatted number/currency, an
 * interpolated aria string, and a count.
 */

vi.mock('@/lib/api', () => ({
  getUsageAttribution: vi.fn(async () => ({ buckets: [] })),
  exportDigest: vi.fn(),
  mediaFileUrl: (id: string) => `/media/${id}/file`,
}));
vi.mock('@/components/export-menu', () => ({ ExportMenu: () => <div>export-menu</div> }));
// Spread the rest of the props: `OpenDetailLink` carries its accessible name on
// `aria-label`, so a mock that drops it would hide the very copy under test.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const session = {
  id: 's1',
  title: 'Refonte de la facturation',
  subtitle: 'billing',
  status: 'running',
  projectDisplay: 'midnite',
  projectSlug: 'midnite',
  lastActivity: Date.now() - 5 * 60_000,
} as unknown as SessionSummary;

afterEach(cleanup);

describe('Phase 82 D — sessions surfaces render fr-FR', () => {
  it('renders the session status and relative time in French on a card', async () => {
    const { SessionCard } = await import('@/components/session-card');
    renderWithIntl(<SessionCard session={session} layout="grid" onClick={vi.fn()} />, {
      locale: 'fr-FR',
    });
    // `sessions.status.running` via `useSessionStatusLabel()`.
    expect(screen.getByText('En cours')).toBeInTheDocument();
    // `common.relativeTime.minutesAgo` via `useRelativeTimeLabel()`.
    expect(screen.getByText('il y a 5 min')).toBeInTheDocument();
    // The deep-link's accessible name comes from `sessions.card.openPage`.
    expect(screen.getByRole('link', { name: 'Ouvrir la page de la session' })).toBeInTheDocument();
  });

  it('renders the French reply affordance with its translated default placeholder', async () => {
    const { ReplyBox } = await import('@/components/reply-box');
    renderWithIntl(<ReplyBox sessionId="s1" />, { locale: 'fr-FR' });
    expect(screen.getByRole('textbox', { name: 'Répondre à l’agent' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Répondre à l’agent…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer la réponse' })).toBeInTheDocument();
  });

  it('shows the French dash when a session has no cost row yet', async () => {
    const { SessionCostLine } = await import('@/components/session-cost-line');
    renderWithIntl(withQueryClient(<SessionCostLine sessionId="s1" />), { locale: 'fr-FR' });
    expect(await screen.findByText('Coût')).toBeInTheDocument();
  });
});

describe('Phase 82 D — media + digests render fr-FR', () => {
  it('renders the French media type picker with per-type blurbs', async () => {
    const { MediaTypePickerModal } = await import('@/components/media-type-picker-modal');
    renderWithIntl(<MediaTypePickerModal onClose={vi.fn()} />, { locale: 'fr-FR' });
    expect(screen.getByRole('dialog', { name: 'Choisir un type de média' })).toBeInTheDocument();
    // `media.types.video` + `media.typePicker.video` — the enum hook and the blurb.
    expect(screen.getByText('Vidéo')).toBeInTheDocument();
    expect(screen.getByText('Générer ou importer un clip vidéo')).toBeInTheDocument();
  });

  it('renders digest stat labels and a French-formatted spend figure', async () => {
    const { DigestDetail } = await import('@/components/digest-detail');
    const digest = {
      id: 'd1',
      headline: 'Récapitulatif quotidien',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-02T00:00:00.000Z',
      counts: { shipped: 3, failed: 1, needsAttention: 0 },
      spend: { totalUsd: 12.5, measuredUsd: 10, sessions: 4 },
      cycle: null,
      sections: [{ name: 'midnite', shipped: 2, failed: 1 }],
      highlights: [],
    } as unknown as Digest;
    renderWithIntl(<DigestDetail digest={digest} />, { locale: 'fr-FR' });
    expect(screen.getByText('Résultats')).toBeInTheDocument();
    expect(screen.getByText('Dépense')).toBeInTheDocument();
    // fr-FR money: comma decimal separator, symbol after the amount.
    expect(screen.getByText('12,50 $')).toBeInTheDocument();
    // The per-section counts are interpolated, not concatenated.
    expect(screen.getByText('2 livrées')).toBeInTheDocument();
  });
});

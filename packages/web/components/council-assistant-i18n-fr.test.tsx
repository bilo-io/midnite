import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import type { Council, CouncilRun } from '@midnite/shared';

import type { ChatCommandState } from '@/hooks/use-chat-command';

import { renderWithIntl } from '@/vitest.render-intl';

/**
 * Phase 82 Theme D (council + assistant slice) — behavioural fr-FR renders.
 *
 * `i18n-council-keys.test.ts` proves every key *resolves* in both locales; these
 * mount a representative component per group under `fr-FR` and assert the French
 * copy actually reaches the DOM — so a call site that resolves a key but renders
 * the wrong one (or hardcodes English beside it) still fails. The same
 * two-layer split the dashboard/guide/workflows slices shipped.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/councils',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api', () => ({
  getCouncils: vi.fn(async () => []),
  createCouncil: vi.fn(),
  deleteCouncil: vi.fn(),
  updateCouncil: vi.fn(),
  createCouncilMember: vi.fn(),
  deleteCouncilMember: vi.fn(),
  reorderCouncilMembers: vi.fn(),
  updateCouncilMember: vi.fn(),
  gatewayUrl: (p: string) => p,
}));

afterEach(cleanup);

const council: Council = {
  id: 'c1',
  name: 'Architecture',
  synthProvider: 'antigravity',
  defaultFormat: 'brainstorm',
  members: [],
  consultationCount: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const run: CouncilRun = {
  id: 'r1',
  councilId: 'c1',
  prompt: 'Faut-il livrer ?',
  format: 'brainstorm',
  status: 'completed',
  syntheses: [],
  members: [],
  startedAt: '2026-01-01T00:00:00.000Z',
};

describe('Phase 82 D — council surfaces render fr-FR', () => {
  it('renders the run thread heading + empty state in French', async () => {
    const { CouncilRunThread } = await import('./council-run-thread');
    renderWithIntl(
      <CouncilRunThread
        runs={[]}
        selectedId={null}
        onSelect={vi.fn()}
        open
        projects={[]}
        onChangeProject={vi.fn()}
      />,
      { locale: 'fr-FR' },
    );
    expect(screen.getByText('Fil')).toBeInTheDocument();
    expect(screen.getByText(/Aucune exécution pour l’instant/)).toBeInTheDocument();
  });

  it('renders the run-status pill label in French', async () => {
    const { CouncilRunThread } = await import('./council-run-thread');
    renderWithIntl(
      <CouncilRunThread
        runs={[run]}
        selectedId={null}
        onSelect={vi.fn()}
        open
        projects={[]}
        onChangeProject={vi.fn()}
      />,
      { locale: 'fr-FR' },
    );
    expect(screen.getByText('Terminé')).toBeInTheDocument();
  });

  it('renders the member-count / consultation tooltips in French', async () => {
    const { CouncilStats } = await import('./council-stats');
    renderWithIntl(<CouncilStats council={council} />, { locale: 'fr-FR' });
    expect(screen.getByTitle('0 membre')).toBeInTheDocument();
    expect(screen.getByTitle('3 consultations')).toBeInTheDocument();
  });

  it('renders the create-council modal in French', async () => {
    const { CouncilCreateModal } = await import('./council-create-modal');
    renderWithIntl(<CouncilCreateModal onClose={vi.fn()} />, { locale: 'fr-FR' });
    expect(screen.getByRole('heading', { name: 'Nouveau conseil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer le conseil' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Comité de revue d’architecture/)).toBeInTheDocument();
  });

  it('renders the members panel + the translated format picker in French', async () => {
    const { CouncilMembersPanel } = await import('./council-participants-panel');
    renderWithIntl(
      <CouncilMembersPanel
        councilId="c1"
        members={[]}
        synthProvider="antigravity"
        defaultFormat="brainstorm"
        disabled={false}
        onChanged={vi.fn()}
        onSynthProviderChange={vi.fn()}
        onDefaultFormatChange={vi.fn()}
        onEditCustom={vi.fn()}
        open
      />,
      { locale: 'fr-FR' },
    );
    expect(screen.getByRole('heading', { name: 'Membres' })).toBeInTheDocument();
    expect(screen.getByText('Synthétiser avec')).toBeInTheDocument();
    // The format label comes from `council.formats.*`, not the English in
    // `COUNCIL_FORMATS_META` — this is the seam under test.
    expect(screen.getByText('Remue-méninges')).toBeInTheDocument();
  });
});

describe('Phase 82 D — assistant surfaces render fr-FR', () => {
  it('renders the chat-to-board composer in French', async () => {
    const { AssistantChat } = await import('./assistant/assistant-chat');
    const chat: ChatCommandState = {
      phase: 'idle',
      busy: false,
      preview: null,
      error: null,
      result: null,
      affectedCount: 0,
      canUndo: false,
      submit: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
      undo: vi.fn(),
      reset: vi.fn(),
    };
    renderWithIntl(<AssistantChat chat={chat} />, { locale: 'fr-FR' });
    expect(screen.getByLabelText('Discuter avec le tableau')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Dites au tableau quoi faire…')).toBeInTheDocument();
  });
});

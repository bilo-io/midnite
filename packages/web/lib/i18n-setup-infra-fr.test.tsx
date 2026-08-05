import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SetupStatus, TaskRetro } from '@midnite/shared';

import { renderWithIntl } from '@/vitest.render-intl';

/**
 * Phase 82 Theme D (setup / routines / infra-chrome) — behavioural proof that the
 * migrated surfaces actually *render* French, not merely that their keys resolve
 * (that's `i18n-setup-infra-keys.test.ts`). One render per copy shape this slice
 * introduced:
 *
 * - a **registry seam** resolving a server-supplied label (`useSetupItemLabel()`),
 * - an **ICU plural** replacing a hand-rolled English one (`nudge.stepsLeft`),
 * - a **compound duration** whose unit suffixes come from the catalog,
 * - a **label hook** replacing an English lookup table (`connection-status`),
 * - a `t.rich` message carrying inline markup (`pwa.iosHint`).
 */

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
// The nudge's CTA carries its accessible name inside the link, so a mock that
// dropped children/props would hide the copy under test.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/api', () => ({
  getSetupStatus: vi.fn(async () => setupStatus),
  getProviders: vi.fn(async () => ({ providers: [], activeProvider: null })),
  getCliStatuses: vi.fn(async () => []),
  getTaskRetro: vi.fn(async () => retro),
  exportTaskRetro: vi.fn(),
  updateProvider: vi.fn(),
  setActiveProvider: vi.fn(),
  createRepo: vi.fn(),
}));
vi.mock('@/components/export-menu', () => ({ ExportMenu: () => <div>export-menu</div> }));

// The gateway sends English labels; the seam must prefer the catalog over them.
const setupStatus: SetupStatus = {
  ready: false,
  items: [
    { id: 'provider', label: 'LLM provider', state: 'missing' },
    { id: 'secret-key', label: 'Secret key', state: 'missing' },
    { id: 'agent-cli', label: 'Agent CLI', state: 'ok' },
    { id: 'agent-pool', label: 'Agent pool', state: 'warn' },
    { id: 'repo', label: 'Repository', state: 'warn' },
  ],
};

const retro = {
  outcome: 'done',
  durations: { waitMs: 125_000, workMs: 7_500_000, totalMs: 7_625_000 },
  narrative: null,
  failures: [],
  review: null,
  checks: null,
  prUrl: null,
  attempts: [],
  timeline: [],
} as unknown as TaskRetro;

afterEach(cleanup);

describe('Phase 82 D — setup surfaces render fr-FR', () => {
  it('renders the checklist labels from the catalog, not the gateway English', async () => {
    const { SetupNudge } = await import('@/components/setup-nudge');
    renderWithIntl(<SetupNudge />, { locale: 'fr-FR' });

    // `provider`'s server label is "LLM provider"; the seam must win.
    expect(await screen.findByText('Fournisseur de LLM')).toBeInTheDocument();
    expect(screen.getByText('Clé secrète')).toBeInTheDocument();
    expect(screen.queryByText('LLM provider')).toBeNull();
  });

  it('pluralises the remaining-steps count in French', async () => {
    const { SetupNudge } = await import('@/components/setup-nudge');
    renderWithIntl(<SetupNudge />, { locale: 'fr-FR' });

    // Two `missing` items → the plural branch. The hand-rolled `step${n===1?'':'s'}`
    // this replaces could only ever have produced English.
    expect(
      await screen.findByText("2 étapes restantes avant que les agents puissent s'exécuter."),
    ).toBeInTheDocument();
  });

  it('renders the wizard steps and provider copy in French', async () => {
    const { SetupWizard } = await import('@/components/SetupWizard');
    renderWithIntl(<SetupWizard open onClose={vi.fn()} />, { locale: 'fr-FR' });

    expect(screen.getByRole('dialog', { name: 'Assistant de configuration' })).toBeInTheDocument();
    expect(screen.getByText('Outils système')).toBeInTheDocument();
    expect(screen.getAllByText("Fournisseur d'IA").length).toBeGreaterThan(0);
  });
});

describe('Phase 82 D — routines & retro surfaces render fr-FR', () => {
  it('renders the retro section titles and a compound duration in French', async () => {
    const { RetroBody } = await import('@/components/retro-tab');
    const task = { id: 't1', title: 'Facturation' } as never;
    renderWithIntl(<RetroBody task={task} retro={retro} />, { locale: 'fr-FR' });

    expect(screen.getByText('Durées')).toBeInTheDocument();
    expect(screen.getByText('Livrée')).toBeInTheDocument();
    // 125s → `2 min 5 s` in fr-FR, where en-GB reads `2m 5s`: the unit suffixes and
    // the spacing both come from `units.duration.*`, which is the point of the
    // message-not-formatter call.
    expect(screen.getByText('2 min 5 s')).toBeInTheDocument();
  });

  it('renders the routine panel empty state in French', async () => {
    const { RoutinePanel } = await import('@/components/routine-panel');
    renderWithIntl(<RoutinePanel routines={[]} progress={[]} />, { locale: 'fr-FR' });

    expect(screen.getByText("Aucune routine pour l'instant.")).toBeInTheDocument();
    expect(screen.getByText('Créer votre première routine')).toBeInTheDocument();
  });
});

describe('Phase 82 D — infra chrome renders fr-FR', () => {
  it('renders the connection pill label from the hook, not the old lookup table', async () => {
    const { useConnectionStore } = await import('@/lib/connection-store');
    useConnectionStore.getState().setChannelStatus('tasks', 'reconnecting');
    const { ConnectionStatus } = await import('@/components/connection-status');
    renderWithIntl(<ConnectionStatus />, { locale: 'fr-FR' });

    expect(screen.getByText('Reconnexion…')).toBeInTheDocument();
  });

  it('renders the PWA hint with its inline markup preserved', async () => {
    const { PwaInstall } = await import('@/components/pwa-install');
    renderWithIntl(<PwaInstall />, { locale: 'fr-FR' });

    // `browserHint` is a `t.rich` message: the emphasised fragments must survive
    // translation as real elements, not as literal `<b>` text.
    expect(screen.getByText('Installer')).toBeInTheDocument();
    expect(screen.getByText("Ajouter à l'écran d'accueil")).toBeInTheDocument();
    expect(screen.queryByText(/<b>/)).toBeNull();
  });

  it('renders the notification centre chrome in French', async () => {
    const { NotificationFeedActions } = await import('@/components/notification-center');
    const { NotificationsProvider } = await import('@/components/notifications-provider');
    const { ToastProvider } = await import('@/components/toast');
    renderWithIntl(
      <ToastProvider>
        <NotificationsProvider>
          <NotificationFeedActions />
        </NotificationsProvider>
      </ToastProvider>,
      { locale: 'fr-FR' },
    );

    expect(screen.getByRole('button', { name: 'Tout marquer comme lu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Effacer les notifications' })).toBeInTheDocument();
  });
});

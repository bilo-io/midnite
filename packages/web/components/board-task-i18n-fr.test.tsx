import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@midnite/shell';
import type { Task } from '@midnite/shared';
import { describe, expect, it } from 'vitest';

import { CATALOGS } from '@/i18n/messages';
import { BulkActionBar } from './bulk-action-bar';
import { NewTaskModal } from './new-task-modal';
import { PrStatusChip } from './pr-status-chip';
import { TaskCard } from './task-card';
import { Timeline } from './task-detail';

/**
 * Phase 82 Theme B — one representative fr-FR render per migrated group (cards,
 * detail, dialog, bulk bar), pinning that the board/task surfaces actually read
 * from the fr-FR catalog. Key-parity itself is enforced by i18n-validate + the
 * fr-parity guard; these assert the wiring (components → namespaces), not
 * every string.
 */
function renderFr(ui: React.ReactElement) {
  return render(
    <LocaleProvider catalogs={CATALOGS} initialLocale="fr-FR">
      {ui}
    </LocaleProvider>,
  );
}

const baseTask: Task = {
  id: 't1',
  title: 'Corriger le tableau',
  status: 'todo',
  priority: 2,
  retryCount: 0,
  fixAttempts: 0,
  tags: [],
  events: [],
};

describe('Phase 82 B — fr-FR renders across the board/task groups', () => {
  it('task card: kind, priority and blocked chips render French', () => {
    renderFr(<TaskCard task={{ ...baseTask, kind: 'feature' }} blockedBy={2} />);
    expect(screen.getByText('Fonctionnalité')).toBeInTheDocument();
    expect(screen.getByText('Haute')).toBeInTheDocument();
    // BlockedBadge: French label + ICU-pluralised aria description.
    expect(screen.getByText('Bloquée')).toBeInTheDocument();
    expect(screen.getByLabelText('Bloquée par 2 tâches')).toBeInTheDocument();
  });

  it('task detail: the activity timeline translates lifecycle event kinds', () => {
    renderFr(
      <Timeline
        events={[
          { at: '2026-07-23T10:00:00.000Z', kind: 'agent.started' },
          { at: '2026-07-23T10:05:00.000Z', kind: 'agent.done' },
        ]}
      />,
    );
    expect(screen.getByText('Agent démarré')).toBeInTheDocument();
    expect(screen.getByText('Agent terminé')).toBeInTheDocument();
  });

  it('task detail: the PR status chip composes its French aria-label', () => {
    renderFr(
      <PrStatusChip
        status={{
          number: 12,
          state: 'merged',
          checks: 'none',
          url: 'https://github.com/acme/repo/pull/12',
          fetchedAt: '2026-07-23T10:00:00.000Z',
        }}
      />,
    );
    expect(screen.getByLabelText('PR n°12 — Fusionnée')).toBeInTheDocument();
  });

  it('new-task dialog: header, mode toggle and footer render French', () => {
    renderFr(
      <NewTaskModal projects={[]} repos={[]} onCreated={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByRole('dialog', { name: 'Nouvelle tâche' })).toBeInTheDocument();
    expect(screen.getByText('Collage en masse')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer la tâche' })).toBeInTheDocument();
  });

  it('bulk bar: the selection count pluralises in French', () => {
    renderFr(<BulkActionBar count={3} actions={[]} onClear={() => {}} />);
    expect(screen.getByText('3 sélectionnés')).toBeInTheDocument();
  });
});

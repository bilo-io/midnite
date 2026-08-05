import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

import { renderWithIntl } from '@/vitest.render-intl';

/**
 * Phase 82 Theme D/F close-out (feature-list modal) — behavioural fr-FR renders.
 *
 * `i18n-validate` proves the keys exist in both catalogs; this mounts the modal under
 * `fr-FR` and asserts the French actually reaches the DOM. Every case is a class of
 * copy the `jsx-text-only` lint gate structurally cannot see, so a green lint run says
 * nothing about it:
 *
 * - the dialog's **`aria-label`** and both **`placeholder`s**
 * - an **ICU plural** on the craft button and on the reused `common.chrome.taskCount`
 *   chip (the old code branched on `taskCount === 1` in JSX)
 * - the destination sheet's **interpolated plural** (`2 tâches depuis « … »`) and its
 *   two column names, which come from the shared `board.columns.*` seam
 * - **error copy** set in a catch block, reached when `createTask` rejects with a
 *   non-`Error` value so the translated fallback is what renders
 */

const createTask = vi.fn();
vi.mock('@/lib/api', () => ({
  createTask: (...a: unknown[]) => createTask(...a),
}));

import { FeatureListModal } from './feature-list-modal';
import type { FeatureDraft } from '@/lib/feature-drafts';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const NAME_PLACEHOLDER = 'ex. Refonte de la facturation';
const TASKS_PLACEHOLDER = 'Décrivez le travail — une tâche par ligne.';

const draft: FeatureDraft = {
  id: 'd1',
  name: 'Refonte de la facturation',
  text: 'corriger la connexion\nexpédier la facturation',
  projectId: null,
  createdAt: 0,
};

function renderModal(over: Partial<FeatureDraft> = {}) {
  return renderWithIntl(
    <FeatureListModal
      draft={{ ...draft, ...over }}
      onClose={vi.fn()}
      onChange={vi.fn()}
      onDelete={vi.fn()}
      onCommitted={vi.fn()}
    />,
    { locale: 'fr-FR' },
  );
}

describe('FeatureListModal — fr-FR', () => {
  it('translates the dialog label, both placeholders and the heading', () => {
    renderModal();

    expect(
      screen.getByRole('dialog', { name: 'Modifier la demande de liste de fonctionnalités' }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(NAME_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(TASKS_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByLabelText('Fermer')).toBeInTheDocument();
  });

  it('pluralises the task count and the craft button in French', () => {
    renderModal();

    // Two non-empty lines → the plural arm of both messages.
    expect(screen.getByText('2 tâches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer 2 tâches' })).toBeInTheDocument();

    // One line → the singular arm, which in French drops the count entirely.
    fireEvent.change(screen.getByPlaceholderText(TASKS_PLACEHOLDER), {
      target: { value: 'corriger la connexion' },
    });
    expect(screen.getByText('1 tâche')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer la tâche' })).toBeInTheDocument();
  });

  it('translates the destination sheet, columns included', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Créer 2 tâches' }));

    expect(screen.getByText('Où doivent-elles aller ?')).toBeInTheDocument();
    expect(screen.getByText('2 tâches depuis « Refonte de la facturation ».')).toBeInTheDocument();
    // Reused from the board's own column vocabulary rather than restated here.
    expect(screen.getByText('À faire')).toBeInTheDocument();
    expect(screen.getByText('En attente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });

  it('surfaces the translated error fallback when the create rejects opaquely', async () => {
    // A non-`Error` rejection has no message to show, so the catch renders
    // `common.errorTitle` — copy the lint gate never sees.
    createTask.mockRejectedValue('boom');
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Créer 2 tâches' }));
    fireEvent.click(screen.getByText('À faire'));

    await waitFor(() =>
      expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument(),
    );
  });
});

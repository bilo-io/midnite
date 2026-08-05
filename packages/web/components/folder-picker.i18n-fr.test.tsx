import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';

import { renderWithIntl } from '@/vitest.render-intl';

/**
 * Phase 82 Theme D (pickers slice) — behavioural fr-FR renders.
 *
 * The folder picker is the slice's only component whose copy is *stateful*: the
 * dialog label, the footer hint/actions, and — on a failed browse — the
 * "doesn't exist yet, create it?" offer all come from `common.pickers.folder.*`.
 * Asserting through the error branch as well as the happy one is what catches a
 * key that only resolves on one of the two renders.
 */

const browseDirectory = vi.fn();
const createDirectory = vi.fn();
vi.mock('@/lib/api', () => ({
  browseDirectory: (...args: unknown[]) => browseDirectory(...args),
  createDirectory: (...args: unknown[]) => createDirectory(...args),
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

describe('Phase 82 D — folder picker renders fr-FR', () => {
  it('labels the dialog, the home button and the footer in French', async () => {
    browseDirectory.mockResolvedValue({ path: '~/code', parent: '~', entries: [] });
    const { FolderPicker } = await import('./folder-picker');
    renderWithIntl(<FolderPicker onSelect={vi.fn()} onClose={vi.fn()} />, { locale: 'fr-FR' });

    expect(
      await screen.findByRole('dialog', { name: 'Choisir un dossier' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Aller au dossier personnel' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText('Les sessions de ce projet s’exécuteront ici.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Utiliser ce dossier' })).toBeInTheDocument();
    // Reused generic key, not a picker-local duplicate.
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });

  it('offers to create a missing folder in French', async () => {
    browseDirectory.mockRejectedValue(new Error('ENOENT: no such file or directory'));
    const { FolderPicker } = await import('./folder-picker');
    renderWithIntl(<FolderPicker initialPath="~/nope" onSelect={vi.fn()} onClose={vi.fn()} />, {
      locale: 'fr-FR',
    });

    expect(
      await screen.findByText('Ce dossier n’existe pas encore. Le créer ?'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer ~/nope' })).toBeInTheDocument();
  });
});

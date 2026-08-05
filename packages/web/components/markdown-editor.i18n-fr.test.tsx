import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';

import { renderWithIntl } from '@/vitest.render-intl';

import { MarkdownEditor } from './markdown-editor';

/**
 * Phase 82 Theme D (composer slice) — behavioural fr-FR render of the markdown field.
 *
 * Three things worth pinning, all of which used to be hardcoded English:
 *
 * - the **mode toggle**, which deliberately mixes a slice key (`common.editor.previewTab`)
 *   with the shared `common.edit` rather than duplicating "Edit" a second time;
 * - the **empty-preview line**, the only visible copy the component owns;
 * - the textarea's **accessible name**, which is an aria-label the jsx-text-only lint
 *   gate cannot see — and which a caller may still override with its own field name.
 */

afterEach(cleanup);

describe('Phase 82 D — MarkdownEditor renders fr-FR', () => {
  it('names the preview/edit tabs and the empty-preview line in French', () => {
    renderWithIntl(<MarkdownEditor value="" onChange={() => {}} />, { locale: 'fr-FR' });

    expect(screen.getByRole('button', { name: 'Aperçu' })).toBeInTheDocument();
    // The Edit tab reuses `common.edit` — proving the shared key, not a duplicate.
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
    expect(screen.getByText('Rien à prévisualiser pour l’instant.')).toBeInTheDocument();
  });

  it('gives the textarea a French accessible name by default, overridable by the caller', () => {
    const { unmount } = renderWithIntl(
      <MarkdownEditor value="# Titre" onChange={() => {}} defaultMode="edit" />,
      { locale: 'fr-FR' },
    );
    expect(screen.getByLabelText('Contenu Markdown')).toBeInTheDocument();
    unmount();

    renderWithIntl(
      <MarkdownEditor
        value="# Titre"
        onChange={() => {}}
        defaultMode="edit"
        ariaLabel="Document de plan"
      />,
      { locale: 'fr-FR' },
    );
    expect(screen.getByLabelText('Document de plan')).toBeInTheDocument();
    expect(screen.queryByLabelText('Contenu Markdown')).not.toBeInTheDocument();
  });

  it('translates the task-list checkbox names in the rendered preview', () => {
    renderWithIntl(
      <MarkdownEditor value={'- [x] fini\n- [ ] à faire'} onChange={() => {}} />,
      { locale: 'fr-FR' },
    );

    expect(screen.getByLabelText('Tâche terminée')).toBeInTheDocument();
    expect(screen.getByLabelText('Tâche non terminée')).toBeInTheDocument();
  });
});

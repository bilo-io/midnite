import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { Memory } from '@midnite/shared';

import { renderWithIntl } from '@/vitest.render-intl';
import { MemoriesTree } from './memories-tree';
import { SourceListEditor, type EditableSource } from './source-list-editor';

/**
 * Phase 82 Theme D (sources composer) — behavioural fr-FR renders.
 *
 * `i18n-validate` proves the keys exist in both catalogs; these mount the composer
 * under `fr-FR` and assert the French actually reaches the DOM. The cases are the
 * classes of copy the `jsx-text-only` lint gate structurally cannot see, so a green
 * lint run says nothing about them:
 *
 * - a `placeholder=` and an `aria-label=` on the add row
 * - a `title=` tooltip on the upload affordance
 * - a validation **error string** set in an event handler (not JSX text)
 * - an **ICU plural** (the source limit, and the tree's memory/source counts)
 */

afterEach(cleanup);

const URL_PLACEHOLDER = 'Collez un lien GitHub, Notion, Google Docs ou tout autre lien';
const UPLOAD_TITLE = 'Importer un fichier (PDF, Markdown, texte)';

const sources: EditableSource[] = [
  { id: 's1', kind: 'link', url: 'https://example.com/doc', title: 'Le document' },
];

function renderEditor(max = 5, onUploadFile?: (file: File) => void) {
  return renderWithIntl(
    <SourceListEditor
      sources={sources}
      max={max}
      onAdd={vi.fn()}
      onRemove={vi.fn()}
      onReorder={vi.fn()}
      onUploadFile={onUploadFile}
    />,
    { locale: 'fr-FR' },
  );
}

describe('SourceListEditor — fr-FR', () => {
  it('renders the add row placeholder, aria-labels and upload tooltip in French', () => {
    renderEditor(5, vi.fn());

    expect(screen.getByPlaceholderText(URL_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByLabelText('Ajouter une source')).toBeInTheDocument();
    expect(screen.getByTitle(UPLOAD_TITLE)).toBeInTheDocument();
    expect(screen.getByLabelText('Réordonner la source')).toBeInTheDocument();
    expect(screen.getByLabelText('Retirer la source')).toBeInTheDocument();
  });

  it('surfaces the invalid-URL error in French', () => {
    renderEditor();

    const input = screen.getByPlaceholderText(URL_PLACEHOLDER);
    fireEvent.change(input, { target: { value: 'not-a-url' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Saisissez une URL complète, avec https://')).toBeInTheDocument();
  });

  it('reports the source limit with a French ICU plural', () => {
    // At the limit the URL input is disabled, so the message comes via the upload path.
    renderEditor(1, vi.fn());

    const fileInput = screen
      .getByTitle(UPLOAD_TITLE)
      .querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'notes.pdf', { type: 'application/pdf' })] },
    });

    expect(screen.getByText('Jusqu’à 1 source')).toBeInTheDocument();
  });
});

const memory = (over: Partial<Memory> & Pick<Memory, 'id' | 'title'>): Memory => ({
  content: '',
  projectId: null,
  sources: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('MemoriesTree — fr-FR', () => {
  it('renders the global scope label and pluralised counts in French', () => {
    renderWithIntl(
      <MemoriesTree
        memories={[
          memory({
            id: 'm1',
            title: 'Conventions',
            content: 'Toujours utiliser des branches.',
            sources: [
              {
                id: 's1',
                memoryId: 'm1',
                kind: 'link',
                url: 'https://example.com',
                createdAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          }),
          memory({
            id: 'm2',
            title: 'Décisions',
            content: 'Nest.js avec Fastify.',
            archived: true,
          }),
        ]}
        projects={[]}
        onOpen={vi.fn()}
        isSelected={() => false}
        onToggleSelect={vi.fn()}
      />,
      { locale: 'fr-FR' },
    );

    expect(screen.getByText('Globale')).toBeInTheDocument();
    expect(screen.getByText('2 mémoires')).toBeInTheDocument();
    expect(screen.getByText('1 source')).toBeInTheDocument();
    expect(screen.getByText('Archivée')).toBeInTheDocument();
  });
});

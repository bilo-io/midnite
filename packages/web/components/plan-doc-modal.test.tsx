import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { ProjectDoc } from '@midnite/shared';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

// Keep the markdown editor a plain textarea for deterministic assertions.
vi.mock('@/components/markdown-editor', () => ({
  MarkdownEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="Document" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { PlanDocModal } from './plan-doc-modal';
import { renderWithIntl as render } from '@/vitest.render-intl';

function makeDoc(overrides: Partial<ProjectDoc> = {}): ProjectDoc {
  return {
    id: 'd1',
    projectId: 'p1',
    templateId: 'prd',
    name: 'PRD',
    tag: 'PRD',
    color: '#6366f1',
    content: '# PRD',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('PlanDocModal', () => {
  it('saves edited content', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <PlanDocModal doc={makeDoc()} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} onGenerate={vi.fn()} />,
    );
    const editor = screen.getByLabelText('Document');
    fireEvent.change(editor, { target: { value: '# PRD updated' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ content: '# PRD updated' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('generates content via Claude and replaces the editor value', async () => {
    const onGenerate = vi.fn().mockResolvedValue(makeDoc({ content: '# Generated' }));
    render(
      <PlanDocModal doc={makeDoc()} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} onGenerate={onGenerate} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Generate/ }));
    await waitFor(() => expect(onGenerate).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText('Document')).toHaveValue('# Generated'));
  });

  it('surfaces an inline error when generation fails', async () => {
    const onGenerate = vi.fn().mockRejectedValue(new Error('LLM down'));
    render(
      <PlanDocModal doc={makeDoc()} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} onGenerate={onGenerate} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Generate/ }));
    expect(await screen.findByText('LLM down')).toBeInTheDocument();
  });

  it('calls onDelete', () => {
    const onDelete = vi.fn();
    render(
      <PlanDocModal doc={makeDoc()} onSave={vi.fn()} onDelete={onDelete} onClose={vi.fn()} onGenerate={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    expect(onDelete).toHaveBeenCalled();
  });
});

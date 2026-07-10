import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Memory, Project } from '@midnite/shared';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const updateMemory = vi.fn();
const deleteMemory = vi.fn();
vi.mock('@/lib/api', () => ({
  updateMemory: (...a: unknown[]) => updateMemory(...a),
  deleteMemory: (...a: unknown[]) => deleteMemory(...a),
}));

// A confirm that always accepts, so the delete path runs without a dialog.
vi.mock('@/components/confirm-dialog', () => ({ useConfirm: () => () => Promise.resolve(true) }));

// Keep the markdown editor a plain textarea for deterministic assertions.
vi.mock('@/components/markdown-editor', () => ({
  MarkdownEditor: ({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel: string }) => (
    <textarea aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { MemoryDocPanel } from './memory-doc-panel';

const project: Project = {
  id: 'p1',
  name: 'Acme',
  tag: 'acme',
  color: '#6366f1',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};
const memory: Memory = {
  id: 'm1',
  title: 'Conventions',
  content: 'body',
  projectId: null,
  sources: [],
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

describe('MemoryDocPanel', () => {
  it('disables Save until a field is dirty, then saves the edit', async () => {
    updateMemory.mockResolvedValue({ ...memory, title: 'Conventions v2' });
    const onSaved = vi.fn();
    render(<MemoryDocPanel memory={memory} projects={[project]} onSaved={onSaved} onDeleted={vi.fn()} />);

    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Memory title'), { target: { value: 'Conventions v2' } });
    expect(save).toBeEnabled();

    fireEvent.click(save);
    await waitFor(() => expect(updateMemory).toHaveBeenCalledWith('m1', expect.objectContaining({ title: 'Conventions v2' })));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('deletes the memory and calls onDeleted', async () => {
    deleteMemory.mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    render(<MemoryDocPanel memory={memory} projects={[project]} onSaved={vi.fn()} onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteMemory).toHaveBeenCalledWith('m1'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });
});

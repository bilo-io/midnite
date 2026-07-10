import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Memory, MemorySource } from '@midnite/shared';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const api = {
  addMemorySource: vi.fn(),
  getMemory: vi.fn(),
  removeMemorySource: vi.fn(),
  reingestMemorySource: vi.fn(),
  reorderMemorySources: vi.fn(),
  uploadMemorySourceFile: vi.fn(),
};
vi.mock('@/lib/api', () => ({
  addMemorySource: (...a: unknown[]) => api.addMemorySource(...a),
  getMemory: (...a: unknown[]) => api.getMemory(...a),
  removeMemorySource: (...a: unknown[]) => api.removeMemorySource(...a),
  reingestMemorySource: (...a: unknown[]) => api.reingestMemorySource(...a),
  reorderMemorySources: (...a: unknown[]) => api.reorderMemorySources(...a),
  uploadMemorySourceFile: (...a: unknown[]) => api.uploadMemorySourceFile(...a),
}));
vi.mock('@/components/confirm-dialog', () => ({ useConfirm: () => () => Promise.resolve(true) }));

import { MemorySourcesPanel } from './memory-sources-panel';

function memoryWith(sources: Partial<MemorySource>[]): Memory {
  return {
    id: 'm1',
    title: 'M',
    content: '',
    projectId: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    sources: sources.map((s, i) => ({
      id: `s${i}`,
      memoryId: 'm1',
      kind: 'link',
      createdAt: '2026-07-01T00:00:00Z',
      ...s,
    })) as MemorySource[],
  };
}

describe('MemorySourcesPanel — ingestion UI', () => {
  it('shows a retry affordance for a failed source and reingests on click', async () => {
    api.reingestMemorySource.mockResolvedValue(memoryWith([{ url: 'https://a.co', ingestState: 'pending' }]));
    const onChange = vi.fn();
    render(
      <MemorySourcesPanel
        memory={memoryWith([{ url: 'https://a.co', ingestState: 'failed', ingestError: 'boom' }])}
        onChange={onChange}
      />,
    );
    const retry = screen.getByRole('button', { name: 'Retry reading source' });
    fireEvent.click(retry);
    await waitFor(() => expect(api.reingestMemorySource).toHaveBeenCalledWith('m1', 's0'));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it('shows a ready check and a pending spinner by ingest state', () => {
    render(
      <MemorySourcesPanel
        memory={memoryWith([
          { url: 'https://a.co', ingestState: 'ready' },
          { url: 'https://b.co', ingestState: 'pending' },
        ])}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Source read')).toBeInTheDocument();
    expect(screen.getByLabelText('Reading source')).toBeInTheDocument();
  });

  it('uploads a chosen file as a source', async () => {
    api.uploadMemorySourceFile.mockResolvedValue(memoryWith([]));
    render(<MemorySourcesPanel memory={memoryWith([])} onChange={vi.fn()} />);
    const input = screen.getByLabelText('Upload a file source').querySelector('input')!;
    const file = new File(['# hi'], 'notes.md', { type: 'text/markdown' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(api.uploadMemorySourceFile).toHaveBeenCalledWith('m1', file));
  });
});

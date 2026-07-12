import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  getMemorySourceContent: vi.fn(),
};
vi.mock('@/lib/api', () => ({
  addMemorySource: (...a: unknown[]) => api.addMemorySource(...a),
  getMemory: (...a: unknown[]) => api.getMemory(...a),
  removeMemorySource: (...a: unknown[]) => api.removeMemorySource(...a),
  reingestMemorySource: (...a: unknown[]) => api.reingestMemorySource(...a),
  reorderMemorySources: (...a: unknown[]) => api.reorderMemorySources(...a),
  uploadMemorySourceFile: (...a: unknown[]) => api.uploadMemorySourceFile(...a),
  getMemorySourceContent: (...a: unknown[]) => api.getMemorySourceContent(...a),
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
});

describe('MemorySourcesPanel — add-source modal', () => {
  it('opens the modal and adds a pasted URL', async () => {
    api.addMemorySource.mockResolvedValue(memoryWith([{ url: 'https://a.co' }]));
    render(<MemorySourcesPanel memory={memoryWith([])} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /add sources/i }));
    const dialog = screen.getByRole('dialog', { name: 'Add sources' });
    const urlInput = within(dialog).getByPlaceholderText(/https/i);
    fireEvent.change(urlInput, { target: { value: 'https://a.co' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add link' }));

    await waitFor(() => expect(api.addMemorySource).toHaveBeenCalledWith('m1', 'https://a.co'));
  });

  it('turns pasted text into a text/plain file upload', async () => {
    api.uploadMemorySourceFile.mockResolvedValue(memoryWith([]));
    render(<MemorySourcesPanel memory={memoryWith([])} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /add sources/i }));
    const dialog = screen.getByRole('dialog', { name: 'Add sources' });
    fireEvent.change(within(dialog).getByPlaceholderText(/copied text/i), {
      target: { value: 'some notes' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add text' }));

    await waitFor(() => expect(api.uploadMemorySourceFile).toHaveBeenCalled());
    const file = api.uploadMemorySourceFile.mock.calls[0]![1] as File;
    expect(file.type).toBe('text/plain');
    expect(await file.text()).toBe('some notes');
  });
});

describe('MemorySourcesPanel — filtering', () => {
  it('narrows the list by free-text search', () => {
    render(
      <MemorySourcesPanel
        memory={memoryWith([
          { url: 'https://alpha.co', title: 'Alpha' },
          { url: 'https://beta.co', title: 'Beta' },
        ])}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search sources'), { target: { value: 'alph' } });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });

  it('pauses reordering while a filter is active', () => {
    render(
      <MemorySourcesPanel
        memory={memoryWith([{ title: 'Alpha' }, { title: 'Beta' }])}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/reordering is paused/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search sources'), { target: { value: 'alpha' } });
    expect(screen.getByText(/reordering is paused/i)).toBeInTheDocument();
    // The grip for the matching row is disabled while filtering.
    expect(screen.getByRole('button', { name: 'Reorder source' })).toBeDisabled();
  });

  it('offers the type filter only when more than one kind is present', () => {
    const { rerender } = render(
      <MemorySourcesPanel
        memory={memoryWith([{ url: 'https://a.co', kind: 'link' }])}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Filter sources by type')).not.toBeInTheDocument();

    rerender(
      <MemorySourcesPanel
        memory={memoryWith([
          { url: 'https://a.co', kind: 'link' },
          { fileName: 'notes.pdf', kind: 'file' },
        ])}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Filter sources by type')).toBeInTheDocument();
  });
});

describe('MemorySourcesPanel — detail modal', () => {
  it('opens the detail modal when a row title is clicked and loads its text', async () => {
    api.getMemorySourceContent.mockResolvedValue({
      id: 's0',
      ingestState: 'ready',
      ingestError: null,
      text: 'scraped body text',
    });
    render(
      <MemorySourcesPanel
        memory={memoryWith([{ url: 'https://a.co', title: 'Alpha', ingestState: 'ready' }])}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    const dialog = await screen.findByRole('dialog', { name: 'Alpha' });
    // Switch to the Text tab and see the fetched content.
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Text' }));
    expect(await within(dialog).findByText('scraped body text')).toBeInTheDocument();
    expect(api.getMemorySourceContent).toHaveBeenCalledWith('m1', 's0');
  });
});

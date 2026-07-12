import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { EditableSource } from '@/components/source-list-editor';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const getMemorySourceContent = vi.fn();
vi.mock('@/lib/api', () => ({
  getMemorySourceContent: (...a: unknown[]) => getMemorySourceContent(...a),
}));

import { SourceDetailModal } from './source-detail-modal';

const openText = () => fireEvent.click(screen.getByRole('tab', { name: 'Text' }));

function renderModal(source: EditableSource) {
  return render(<SourceDetailModal memoryId="m1" source={source} onClose={vi.fn()} />);
}

describe('SourceDetailModal — source tab', () => {
  it('embeds a YouTube video', () => {
    renderModal({ id: 's1', kind: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Clip' });
    const frame = screen.getByTitle('YouTube preview') as HTMLIFrameElement;
    expect(frame.src).toContain('youtube.com/embed/dQw4w9WgXcQ');
  });

  it('renders a sandboxed iframe + open-original fallback for a website', () => {
    const { container } = renderModal({ id: 's1', kind: 'link', url: 'https://example.com/doc', title: 'Doc' });
    const frame = container.querySelector('iframe')!;
    expect(frame.getAttribute('sandbox')).toContain('allow-scripts');
    expect(frame.getAttribute('src')).toBe('https://example.com/doc');
    expect(screen.getByText(/open the original/i)).toBeInTheDocument();
  });

  it('shows file metadata (no iframe) for an uploaded file', () => {
    const { container } = renderModal({ id: 's1', kind: 'file', fileName: 'notes.pdf' });
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getAllByText('notes.pdf').length).toBeGreaterThan(0);
    expect(screen.getByText(/extracted text is in the text tab/i)).toBeInTheDocument();
  });
});

describe('SourceDetailModal — text tab', () => {
  it('fetches and shows the extracted text', async () => {
    getMemorySourceContent.mockResolvedValue({
      id: 's1',
      ingestState: 'ready',
      ingestError: null,
      text: 'the scraped body',
    });
    renderModal({ id: 's1', kind: 'link', url: 'https://a.co', title: 'A' });
    openText();
    expect(await screen.findByText('the scraped body')).toBeInTheDocument();
    expect(getMemorySourceContent).toHaveBeenCalledWith('m1', 's1');
  });

  it('surfaces the ingest error on a failed source', async () => {
    getMemorySourceContent.mockResolvedValue({
      id: 's1',
      ingestState: 'failed',
      ingestError: 'fetch timed out',
      text: null,
    });
    renderModal({ id: 's1', kind: 'link', url: 'https://a.co', title: 'A' });
    openText();
    expect(await screen.findByText(/fetch timed out/i)).toBeInTheDocument();
  });

  it('shows an empty state when no text was extracted', async () => {
    getMemorySourceContent.mockResolvedValue({
      id: 's1',
      ingestState: 'ready',
      ingestError: null,
      text: '',
    });
    renderModal({ id: 's1', kind: 'link', url: 'https://a.co', title: 'A' });
    openText();
    expect(await screen.findByText(/no text extracted/i)).toBeInTheDocument();
  });

  it('shows a still-reading state while pending', async () => {
    getMemorySourceContent.mockResolvedValue({
      id: 's1',
      ingestState: 'pending',
      ingestError: null,
      text: null,
    });
    renderModal({ id: 's1', kind: 'link', url: 'https://a.co', title: 'A' });
    openText();
    expect(await screen.findByText(/still reading/i)).toBeInTheDocument();
  });
});

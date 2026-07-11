import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MemoryArtifact } from '@midnite/shared';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const api = {
  getMemoryArtifacts: vi.fn(),
  generateMemoryArtifact: vi.fn(),
};
vi.mock('@/lib/api', () => ({
  getMemoryArtifacts: (...a: unknown[]) => api.getMemoryArtifacts(...a),
  generateMemoryArtifact: (...a: unknown[]) => api.generateMemoryArtifact(...a),
  memoryArtifactFileUrl: (id: string, artifactId: string) => `http://gw/memories/${id}/artifacts/${artifactId}/file`,
}));

import { MemoryStudioRail } from './memory-studio-rail';

function artifact(overrides: Partial<MemoryArtifact>): MemoryArtifact {
  return {
    id: 'a1',
    memoryId: 'm1',
    kind: 'brief',
    format: 'markdown',
    title: 'Executive brief',
    content: '# Hi',
    status: 'ready',
    error: null,
    filePath: null,
    mimeType: null,
    fileSize: null,
    degraded: false,
    createdAt: 'now',
    updatedAt: 'now',
    ...overrides,
  };
}

describe('MemoryStudioRail', () => {
  it('renders a generate affordance per wired kind including audio + video', async () => {
    api.getMemoryArtifacts.mockResolvedValue([]);
    render(<MemoryStudioRail memoryId="m1" />);
    await waitFor(() => expect(api.getMemoryArtifacts).toHaveBeenCalledWith('m1'));
    expect(screen.getByText('Executive brief')).toBeInTheDocument();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
    expect(screen.getByText('Infographic')).toBeInTheDocument();
    expect(screen.getByText('Audio overview')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
    // Every kind is now generatable (no "Soon" placeholders).
    expect(screen.getAllByLabelText(/^Generate /)).toHaveLength(7);
    expect(screen.queryByText('Soon')).not.toBeInTheDocument();
  });

  it('groups the kinds under section headings', async () => {
    api.getMemoryArtifacts.mockResolvedValue([]);
    render(<MemoryStudioRail memoryId="m1" />);
    await waitFor(() => expect(api.getMemoryArtifacts).toHaveBeenCalled());
    for (const heading of ['Documents', 'Visual', 'Audio & video']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
  });

  it('kicks generation and shows the pending state', async () => {
    api.getMemoryArtifacts.mockResolvedValue([]);
    api.generateMemoryArtifact.mockResolvedValue(artifact({ status: 'pending', content: '' }));
    render(<MemoryStudioRail memoryId="m1" />);
    await waitFor(() => expect(api.getMemoryArtifacts).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('Generate Executive brief'));
    await waitFor(() => expect(api.generateMemoryArtifact).toHaveBeenCalledWith('m1', 'brief'));
    expect(await screen.findByText('Generating')).toBeInTheDocument();
  });

  it('surfaces a failed artifact error inline', async () => {
    api.getMemoryArtifacts.mockResolvedValue([
      artifact({ status: 'failed', error: 'No AI provider is configured.' }),
    ]);
    render(<MemoryStudioRail memoryId="m1" />);
    expect(await screen.findByText('No AI provider is configured.')).toBeInTheDocument();
  });

  it('shows a degraded hint for a script-only audio overview', async () => {
    api.getMemoryArtifacts.mockResolvedValue([
      artifact({ kind: 'audio-overview', format: 'audio', title: 'Audio overview', degraded: true }),
    ]);
    render(<MemoryStudioRail memoryId="m1" />);
    expect(await screen.findByText('Script only — no TTS provider')).toBeInTheDocument();
  });

  it('opens the viewer for a ready artifact', async () => {
    api.getMemoryArtifacts.mockResolvedValue([artifact({ status: 'ready', content: '# Rocket brief' })]);
    render(<MemoryStudioRail memoryId="m1" />);
    fireEvent.click(await screen.findByTitle('View Executive brief'));
    expect(await screen.findByRole('dialog', { name: 'Executive brief' })).toBeInTheDocument();
    expect(screen.getByText('Rocket brief')).toBeInTheDocument();
  });

  it('renders an audio player in the viewer for a ready audio overview', async () => {
    api.getMemoryArtifacts.mockResolvedValue([
      artifact({
        id: 'aud1',
        kind: 'audio-overview',
        format: 'audio',
        title: 'Audio overview',
        content: '# Transcript',
        filePath: 'memory-studio/aud1.mp3',
        mimeType: 'audio/mpeg',
        fileSize: 999,
      }),
    ]);
    render(<MemoryStudioRail memoryId="m1" />);
    fireEvent.click(await screen.findByTitle('View Audio overview'));
    const player = await screen.findByLabelText('Audio overview audio');
    expect(player).toHaveAttribute('src', 'http://gw/memories/m1/artifacts/aud1/file');
  });
});

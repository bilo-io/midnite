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
    createdAt: 'now',
    updatedAt: 'now',
    ...overrides,
  };
}

describe('MemoryStudioRail', () => {
  it('renders a generate affordance per wired kind + the Soon items', async () => {
    api.getMemoryArtifacts.mockResolvedValue([]);
    render(<MemoryStudioRail memoryId="m1" />);
    await waitFor(() => expect(api.getMemoryArtifacts).toHaveBeenCalledWith('m1'));
    expect(screen.getByText('Executive brief')).toBeInTheDocument();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
    expect(screen.getByText('Infographic')).toBeInTheDocument();
    // audio/video are shown but disabled ("Soon")
    expect(screen.getByText('Audio overview')).toBeInTheDocument();
    expect(screen.getAllByText('Soon')).toHaveLength(2);
  });

  it('kicks generation and shows the pending state', async () => {
    api.getMemoryArtifacts.mockResolvedValue([]);
    api.generateMemoryArtifact.mockResolvedValue(artifact({ status: 'pending', content: '' }));
    render(<MemoryStudioRail memoryId="m1" />);
    await waitFor(() => expect(api.getMemoryArtifacts).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('Generate Executive brief'));
    await waitFor(() =>
      expect(api.generateMemoryArtifact).toHaveBeenCalledWith('m1', 'brief'),
    );
    expect(await screen.findByText('Generating')).toBeInTheDocument();
  });

  it('surfaces a failed artifact error inline', async () => {
    api.getMemoryArtifacts.mockResolvedValue([
      artifact({ status: 'failed', error: 'No AI provider is configured.' }),
    ]);
    render(<MemoryStudioRail memoryId="m1" />);
    expect(await screen.findByText('No AI provider is configured.')).toBeInTheDocument();
  });

  it('opens the viewer for a ready artifact', async () => {
    api.getMemoryArtifacts.mockResolvedValue([artifact({ status: 'ready', content: '# Rocket brief' })]);
    render(<MemoryStudioRail memoryId="m1" />);
    fireEvent.click(await screen.findByTitle('View Executive brief'));
    expect(await screen.findByRole('dialog', { name: 'Executive brief' })).toBeInTheDocument();
    expect(screen.getByText('Rocket brief')).toBeInTheDocument();
  });
});

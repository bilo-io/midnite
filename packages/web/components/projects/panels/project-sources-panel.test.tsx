import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MAX_SOURCES_PER_PROJECT, type Project } from '@midnite/shared';

const addProjectSource = vi.fn();
const removeProjectSource = vi.fn();
const reorderProjectSources = vi.fn();
vi.mock('@/lib/api', () => ({
  addProjectSource: (...a: unknown[]) => addProjectSource(...a),
  removeProjectSource: (...a: unknown[]) => removeProjectSource(...a),
  reorderProjectSources: (...a: unknown[]) => reorderProjectSources(...a),
}));

import { ProjectSourcesPanel } from './project-sources-panel';
import { ConfirmProvider } from '@/components/confirm-dialog';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const PROJECT: Project = {
  id: 'project-1',
  name: 'Billing revamp',
  tag: 'billing',
  color: '#6366f1',
  sources: [],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

function renderPanel(onChange = vi.fn()) {
  return {
    onChange,
    ...render(
      <ConfirmProvider>
        <ProjectSourcesPanel project={PROJECT} onChange={onChange} />
      </ConfirmProvider>,
    ),
  };
}

it('shows the source count against the max', () => {
  renderPanel();
  expect(screen.getByText(`0/${MAX_SOURCES_PER_PROJECT}`)).toBeInTheDocument();
});

it('adds a source and bubbles the updated project', async () => {
  const updated: Project = {
    ...PROJECT,
    sources: [
      {
        id: 's1',
        projectId: 'project-1',
        url: 'https://example.com',
        kind: 'link',
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ],
  };
  addProjectSource.mockResolvedValue(updated);
  const { onChange } = renderPanel();

  fireEvent.change(screen.getByPlaceholderText(/Paste a Google Docs/i), {
    target: { value: 'https://example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add source' }));

  await waitFor(() => expect(addProjectSource).toHaveBeenCalledWith('project-1', 'https://example.com'));
  expect(onChange).toHaveBeenCalledWith(updated);
});

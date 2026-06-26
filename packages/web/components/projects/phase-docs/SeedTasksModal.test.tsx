import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Breakdown } from '@midnite/shared';

const previewPhaseDocSeed = vi.fn();
const seedPhaseDocTasks = vi.fn();

vi.mock('@/lib/api', () => ({
  previewPhaseDocSeed: (...a: unknown[]) => previewPhaseDocSeed(...a),
  seedPhaseDocTasks: (...a: unknown[]) => seedPhaseDocTasks(...a),
}));

import { SeedTasksModal } from './SeedTasksModal';

const BREAKDOWN: Breakdown = {
  tasks: [
    { ref: 'a', title: 'Replace cookies with JWTs', anchor: 'replace-cookies-with-jwts', dependsOn: [] },
    { ref: 'b', title: 'Add refresh rotation', anchor: 'add-refresh-rotation', dependsOn: [] },
  ],
};

function renderModal(onSeeded = vi.fn(), onClose = vi.fn()) {
  render(
    <SeedTasksModal
      projectId="p1"
      repoId="r1"
      filename="auth.md"
      onSeeded={onSeeded}
      onClose={onClose}
    />,
  );
  return { onSeeded, onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  previewPhaseDocSeed.mockResolvedValue({ breakdown: BREAKDOWN, isFallback: true });
  seedPhaseDocTasks.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
});

describe('SeedTasksModal', () => {
  it('previews the parsed tasks and labels the seed button with the count', async () => {
    renderModal();
    expect(previewPhaseDocSeed).toHaveBeenCalledWith('p1', 'r1', 'auth.md');
    expect(await screen.findByDisplayValue('Replace cookies with JWTs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seed 2 tasks/ })).toBeInTheDocument();
  });

  it('seeds the (edited) breakdown and reports the created count', async () => {
    const { onSeeded, onClose } = renderModal();
    await screen.findByDisplayValue('Replace cookies with JWTs');

    fireEvent.click(screen.getByRole('button', { name: /Seed 2 tasks/ }));

    await waitFor(() => expect(seedPhaseDocTasks).toHaveBeenCalledWith('p1', 'auth.md', BREAKDOWN));
    expect(onSeeded).toHaveBeenCalledWith(2);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an empty state and disables seeding when no tasks were found', async () => {
    previewPhaseDocSeed.mockResolvedValue({ breakdown: { tasks: [] }, isFallback: true });
    renderModal();
    expect(await screen.findByText(/No tasks found/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seed task/ })).toBeDisabled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Project } from '@midnite/shared';

const draftProjectPlan = vi.fn();
const updateProjectPlan = vi.fn();
const createTasksFromPlan = vi.fn();
const draftProjectBreakdown = vi.fn();
const createTasksFromBreakdown = vi.fn();
vi.mock('@/lib/api', () => ({
  draftProjectPlan: (...a: unknown[]) => draftProjectPlan(...a),
  updateProjectPlan: (...a: unknown[]) => updateProjectPlan(...a),
  createTasksFromPlan: (...a: unknown[]) => createTasksFromPlan(...a),
  draftProjectBreakdown: (...a: unknown[]) => draftProjectBreakdown(...a),
  createTasksFromBreakdown: (...a: unknown[]) => createTasksFromBreakdown(...a),
}));

import { PlanPanel } from './plan-panel';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const NOW = '2026-06-24T10:00:00.000Z';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Acme',
    tag: 'ACM',
    color: '#3366ff',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('PlanPanel — breakdown tab', () => {
  it('generates a breakdown, renders the editable preview, and creates the board on confirm', async () => {
    draftProjectBreakdown.mockResolvedValue({
      breakdown: {
        tasks: [
          { ref: 'api', title: 'Build API', kind: 'feature', priority: 2, dependsOn: [] },
          { ref: 'ui', title: 'Build UI', kind: 'feature', priority: 1, dependsOn: ['api'] },
        ],
      },
      isFallback: false,
    });
    createTasksFromBreakdown.mockResolvedValue([]);

    render(<PlanPanel project={makeProject()} onClose={vi.fn()} onChanged={vi.fn()} />);

    // Switch to the Breakdown tab and generate.
    fireEvent.click(screen.getByRole('tab', { name: /Breakdown/ }));
    fireEvent.click(screen.getByRole('button', { name: /Generate breakdown/ }));

    await waitFor(() => expect(draftProjectBreakdown).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(screen.getByDisplayValue('Build API')).toBeInTheDocument());
    expect(screen.getByDisplayValue('Build UI')).toBeInTheDocument();

    // Confirm creates the board with the previewed breakdown.
    fireEvent.click(screen.getByRole('button', { name: /Create 2 tasks/ }));
    await waitFor(() => expect(createTasksFromBreakdown).toHaveBeenCalledTimes(1));
    const [id, breakdown] = createTasksFromBreakdown.mock.calls[0]!;
    expect(id).toBe('p1');
    expect(breakdown.tasks).toHaveLength(2);
  });

  it('surfaces a fallback notice when AI planning was unavailable', async () => {
    draftProjectBreakdown.mockResolvedValue({
      breakdown: { tasks: [{ ref: 't1', title: 'Do it', dependsOn: [] }] },
      isFallback: true,
    });

    render(<PlanPanel project={makeProject()} onClose={vi.fn()} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: /Breakdown/ }));
    fireEvent.click(screen.getByRole('button', { name: /Generate breakdown/ }));

    await waitFor(() =>
      expect(screen.getByText(/AI planning was unavailable/)).toBeInTheDocument(),
    );
  });
});

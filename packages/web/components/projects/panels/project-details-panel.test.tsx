import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Project } from '@midnite/shared';

const getRepos = vi.fn();
const updateProject = vi.fn();
const enhanceProjectDescription = vi.fn();
vi.mock('@/lib/api', () => ({
  getRepos: (...a: unknown[]) => getRepos(...a),
  updateProject: (...a: unknown[]) => updateProject(...a),
  enhanceProjectDescription: (...a: unknown[]) => enhanceProjectDescription(...a),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { ProjectDetailsPanel } from './project-details-panel';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  getRepos.mockResolvedValue([]);
  updateProject.mockResolvedValue(undefined);
});

const PROJECT: Project = {
  id: 'project-1',
  name: 'Billing revamp',
  description: 'Rework billing',
  tag: 'billing',
  color: '#6366f1',
  sources: [],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

it('prefills the form from the project', () => {
  render(<ProjectDetailsPanel project={PROJECT} onSaved={vi.fn()} />);
  expect(screen.getByLabelText('Title')).toHaveValue('Billing revamp');
});

it('saves the edited fields and fires onSaved', async () => {
  const onSaved = vi.fn();
  render(<ProjectDetailsPanel project={PROJECT} onSaved={onSaved} />);

  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Billing v2  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() =>
    expect(updateProject).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ name: 'Billing v2', tag: 'billing' }),
    ),
  );
  expect(onSaved).toHaveBeenCalled();
});

it('links to the memory route and closes on navigate', () => {
  const onAfterNavigate = vi.fn();
  render(<ProjectDetailsPanel project={PROJECT} onSaved={vi.fn()} onAfterNavigate={onAfterNavigate} />);

  fireEvent.click(screen.getByText(/Create a memory for this project/i));
  expect(push).toHaveBeenCalledWith('/memory?create=project-1');
  expect(onAfterNavigate).toHaveBeenCalled();
});

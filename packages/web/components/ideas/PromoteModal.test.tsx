import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Idea, PromoteIdeaResponse } from '@midnite/shared';

const promoteIdeaToProject = vi.fn();
vi.mock('@/lib/api', () => ({
  promoteIdeaToProject: (...args: unknown[]) => promoteIdeaToProject(...args),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { PromoteModal } from './PromoteModal';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const IDEA: Idea = {
  id: 'idea-1',
  title: 'Cool idea',
  body: 'the body',
  status: 'refined',
  projectId: null,
  tags: ['growth'],
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
};

const RESPONSE: PromoteIdeaResponse = {
  idea: { ...IDEA, status: 'promoted', projectId: 'project-9' },
  project: {
    id: 'project-9',
    name: 'Cool idea',
    tag: 'growth',
    color: '#6366f1',
    sources: [],
    ideaId: 'idea-1',
    createdAt: '2026-06-27T00:00:00.000Z',
    updatedAt: '2026-06-27T00:00:00.000Z',
  },
};

it('renders nothing when closed', () => {
  const { container } = render(<PromoteModal idea={IDEA} open={false} onClose={vi.fn()} />);
  expect(container).toBeEmptyDOMElement();
});

it('prefills the project name from the idea title', () => {
  render(<PromoteModal idea={IDEA} open onClose={vi.fn()} />);
  expect(screen.getByLabelText('Project name')).toHaveValue('Cool idea');
});

it('promotes with the entered name, fires onPromoted, and routes to the project', async () => {
  promoteIdeaToProject.mockResolvedValue(RESPONSE);
  const onPromoted = vi.fn();
  render(<PromoteModal idea={IDEA} open onClose={vi.fn()} onPromoted={onPromoted} />);

  fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Renamed project' } });
  fireEvent.click(screen.getByRole('button', { name: /Create project/i }));

  await waitFor(() => expect(promoteIdeaToProject).toHaveBeenCalledWith('idea-1', { name: 'Renamed project' }));
  expect(onPromoted).toHaveBeenCalledWith(RESPONSE);
  expect(push).toHaveBeenCalledWith('/projects?open=project-9');
});

it('shows an error and does not route when the name is blank', async () => {
  render(<PromoteModal idea={IDEA} open onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Project name'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: /Create project/i }));

  expect(await screen.findByText('Give the project a name')).toBeInTheDocument();
  expect(promoteIdeaToProject).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});

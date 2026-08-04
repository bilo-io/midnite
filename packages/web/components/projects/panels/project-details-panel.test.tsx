import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import type { Project } from '@midnite/shared';

const updateProject = vi.fn();
const enhanceProjectDescription = vi.fn();
vi.mock('@/lib/api', () => ({
  updateProject: (...a: unknown[]) => updateProject(...a),
  enhanceProjectDescription: (...a: unknown[]) => enhanceProjectDescription(...a),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { ProjectDetailsPanel } from './project-details-panel';
import { withLocale } from '@/lib/test-locale-wrapper';

/** These components read the i18n catalog (Phase 82 D) — mount the locale provider. */
const render = (ui: ReactElement) => rtlRender(withLocale(ui));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  updateProject.mockResolvedValue(undefined);
});

const PROJECT: Project = {
  id: 'project-1',
  name: 'Billing revamp',
  description: 'Rework billing',
  tag: 'billing',
  color: '#6366f1',
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

it('prefills and saves the start/build commands', async () => {
  render(
    <ProjectDetailsPanel
      project={{ ...PROJECT, startCommand: 'pnpm dev', buildCommand: 'pnpm build' }}
      onSaved={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('Start command')).toHaveValue('pnpm dev');
  expect(screen.getByLabelText('Build command')).toHaveValue('pnpm build');

  fireEvent.change(screen.getByLabelText('Start command'), { target: { value: 'pnpm run dev' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() =>
    expect(updateProject).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ startCommand: 'pnpm run dev', buildCommand: 'pnpm build' }),
    ),
  );
});

it('links to the memory route and closes on navigate', () => {
  const onAfterNavigate = vi.fn();
  render(<ProjectDetailsPanel project={PROJECT} onSaved={vi.fn()} onAfterNavigate={onAfterNavigate} />);

  fireEvent.click(screen.getByText(/Create a memory for this project/i));
  expect(push).toHaveBeenCalledWith('/memory?create=project-1');
  expect(onAfterNavigate).toHaveBeenCalled();
});

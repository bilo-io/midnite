import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Repo } from '@midnite/shared';
import { ConfirmProvider } from '@/components/confirm-dialog';

const getRepos = vi.fn();
const createRepo = vi.fn();
const updateRepo = vi.fn();
const deleteRepo = vi.fn();
vi.mock('@/lib/api', () => ({
  getRepos: () => getRepos(),
  createRepo: (...args: unknown[]) => createRepo(...args),
  updateRepo: (...args: unknown[]) => updateRepo(...args),
  deleteRepo: (...args: unknown[]) => deleteRepo(...args),
}));

import { ReposView } from './repos-view';

const repo = (over: Partial<Repo> = {}): Repo => ({
  id: 'r1',
  name: 'api',
  path: '~/Dev/api',
  createdAt: '',
  updatedAt: '',
  ...over,
});

function renderView() {
  return render(
    <ConfirmProvider>
      <ReposView />
    </ConfirmProvider>,
  );
}

describe('ReposView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists repos returned by the API', async () => {
    getRepos.mockResolvedValue([repo({ id: 'r1', name: 'api' }), repo({ id: 'r2', name: 'web' })]);
    renderView();
    expect(await screen.findByText('api')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
  });

  it('shows an empty state when there are no repos', async () => {
    getRepos.mockResolvedValue([]);
    renderView();
    expect(await screen.findByText(/no repos yet/i)).toBeInTheDocument();
  });

  it('creates a repo from the add form', async () => {
    getRepos.mockResolvedValue([]);
    createRepo.mockResolvedValue(repo({ id: 'r9', name: 'service', path: '~/Dev/service' }));
    renderView();
    await screen.findByText(/no repos yet/i);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'service' } });
    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '~/Dev/service' } });
    fireEvent.click(screen.getByRole('button', { name: /add repo/i }));

    await waitFor(() =>
      expect(createRepo).toHaveBeenCalledWith({ name: 'service', path: '~/Dev/service' }),
    );
    expect(await screen.findByText('service')).toBeInTheDocument();
  });

  it('sends branch prefix and PR template when creating', async () => {
    getRepos.mockResolvedValue([]);
    createRepo.mockResolvedValue(repo({ id: 'r9', name: 'service', branchPrefix: 'feature/' }));
    renderView();
    await screen.findByText(/no repos yet/i);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'service' } });
    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '~/Dev/service' } });
    fireEvent.change(screen.getByLabelText(/branch prefix/i), { target: { value: 'feature/' } });
    fireEvent.change(screen.getByLabelText(/pr template/i), { target: { value: '## Why' } });
    fireEvent.click(screen.getByRole('button', { name: /add repo/i }));

    await waitFor(() =>
      expect(createRepo).toHaveBeenCalledWith({
        name: 'service',
        path: '~/Dev/service',
        branchPrefix: 'feature/',
        prTemplate: '## Why',
      }),
    );
  });

  it('shows the branch prefix on a repo that has one', async () => {
    getRepos.mockResolvedValue([repo({ name: 'api', branchPrefix: 'feature/', prTemplate: '## Why' })]);
    renderView();
    await screen.findByText('api');
    // Scope to the repo's row — the add form also has a "PR template" label.
    const row = within(screen.getByRole('listitem'));
    expect(row.getByText('feature/')).toBeInTheDocument();
    expect(row.getByText(/PR template/i)).toBeInTheDocument();
  });

  it('edits a repo’s conventions', async () => {
    getRepos.mockResolvedValue([repo({ id: 'r1', name: 'api', branchPrefix: 'feature/' })]);
    updateRepo.mockResolvedValue(repo({ id: 'r1', name: 'api', branchPrefix: 'fix/' }));
    renderView();
    await screen.findByText('api');

    fireEvent.click(screen.getByRole('button', { name: /edit api/i }));
    const prefixField = screen.getByLabelText('Branch prefix');
    expect(prefixField).toHaveValue('feature/');
    fireEvent.change(prefixField, { target: { value: 'fix/' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(updateRepo).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ branchPrefix: 'fix/' }),
      ),
    );
  });

  it('surfaces a server error (e.g. duplicate name) without adding a row', async () => {
    getRepos.mockResolvedValue([repo({ id: 'r1', name: 'api' })]);
    createRepo.mockRejectedValue(new Error('a repo named "api" already exists'));
    renderView();
    await screen.findByText('api');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'api' } });
    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '~/Dev/api2' } });
    fireEvent.click(screen.getByRole('button', { name: /add repo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  });

  it('validates that name and path are required before calling the API', async () => {
    getRepos.mockResolvedValue([]);
    renderView();
    await screen.findByText(/no repos yet/i);

    fireEvent.click(screen.getByRole('button', { name: /add repo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/required/i);
    expect(createRepo).not.toHaveBeenCalled();
  });
});

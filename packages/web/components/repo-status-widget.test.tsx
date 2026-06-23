import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { Repo, Status, Task } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getTasks = vi.fn();
const getRepos = vi.fn();
vi.mock('@/lib/api', () => ({
  getTasks: () => getTasks(),
  getRepos: () => getRepos(),
}));

import { RepoStatusWidget } from './repo-status-widget';

let seq = 0;
function task(repo: string | null, status: Status): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `task ${seq}`,
    kind: 'feature',
    status,
    priority: 1,
    repo: repo ?? undefined,
    createdAt: '',
    updatedAt: '',
  } as Task;
}
const repo = (name: string): Repo => ({ id: name, name, path: `~/repos/${name}`, createdAt: '', updatedAt: '' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RepoStatusWidget', () => {
  it('renders a row per repo with running / queued / done counts', async () => {
    getTasks.mockResolvedValue([task('web', 'wip'), task('web', 'todo'), task('web', 'todo'), task('web', 'done')]);
    getRepos.mockResolvedValue([repo('web')]);
    render(withQueryClient(<RepoStatusWidget />));

    await waitFor(() => expect(screen.getByText('web')).toBeInTheDocument());
    const row = screen.getByText('web').closest('li')!;
    expect(row).toHaveTextContent('1');
    expect(within(row).getByLabelText('1 running')).toBeInTheDocument();
    expect(within(row).getByLabelText('2 queued')).toBeInTheDocument();
    expect(within(row).getByLabelText('1 done')).toBeInTheDocument();
  });

  it('shows an Unassigned bucket for tasks without a repo, last', async () => {
    getTasks.mockResolvedValue([task('web', 'wip'), task(null, 'todo')]);
    getRepos.mockResolvedValue([repo('web')]);
    render(withQueryClient(<RepoStatusWidget />));

    await waitFor(() => expect(screen.getByText('Unassigned')).toBeInTheDocument());
    const rows = screen.getAllByRole('listitem');
    expect(rows.at(-1)).toHaveTextContent('Unassigned');
  });

  it('shows an empty hint when no repos are registered and nothing is unassigned', async () => {
    getTasks.mockResolvedValue([]);
    getRepos.mockResolvedValue([]);
    render(withQueryClient(<RepoStatusWidget />));

    await waitFor(() => expect(screen.getByText(/No repos registered/)).toBeInTheDocument());
  });
});

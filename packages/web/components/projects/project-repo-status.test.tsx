import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RepoStatusResponse } from '@midnite/shared';

const getRepoStatus = vi.fn();
const initRepo = vi.fn();

vi.mock('@/lib/api', () => ({
  getRepoStatus: (...a: unknown[]) => getRepoStatus(...a),
  initRepo: (...a: unknown[]) => initRepo(...a),
}));

import { ProjectRepoStatus } from './project-repo-status';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProjectRepoStatus', () => {
  it('shows "No folder set" without calling the API when workDir is unset', () => {
    render(<ProjectRepoStatus projectId="p1" workDir={undefined} />);
    expect(screen.getByText('No folder set')).toBeInTheDocument();
    expect(getRepoStatus).not.toHaveBeenCalled();
  });

  it('shows "Folder not found" when the directory does not exist', async () => {
    getRepoStatus.mockResolvedValue({ exists: false, isRepo: false } satisfies RepoStatusResponse);
    render(<ProjectRepoStatus projectId="p1" workDir="~/gone" />);
    expect(await screen.findByText('Folder not found')).toBeInTheDocument();
  });

  it('offers Init repo for an existing folder that is not a git repo, and refetches after init', async () => {
    getRepoStatus.mockResolvedValue({ exists: true, isRepo: false } satisfies RepoStatusResponse);
    initRepo.mockResolvedValue({
      exists: true,
      isRepo: true,
      branch: 'main',
      dirty: false,
    } satisfies RepoStatusResponse);

    render(<ProjectRepoStatus projectId="p1" workDir="~/Dev/plain-folder" />);
    expect(await screen.findByText('Not a git repo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Init repo' }));

    await waitFor(() => expect(initRepo).toHaveBeenCalledWith('p1'));
    expect(await screen.findByText('main')).toBeInTheDocument();
  });

  it('shows the branch and a clean indicator for a clean repo', async () => {
    getRepoStatus.mockResolvedValue({
      exists: true,
      isRepo: true,
      branch: 'main',
      dirty: false,
    } satisfies RepoStatusResponse);
    render(<ProjectRepoStatus projectId="p1" workDir="~/Dev/repo" />);
    expect(await screen.findByText('main')).toBeInTheDocument();
    expect(await screen.findByText('· clean')).toBeInTheDocument();
  });

  it('shows a dirty indicator when there are uncommitted changes', async () => {
    getRepoStatus.mockResolvedValue({
      exists: true,
      isRepo: true,
      branch: 'feature/x',
      dirty: true,
    } satisfies RepoStatusResponse);
    render(<ProjectRepoStatus projectId="p1" workDir="~/Dev/repo" />);
    expect(await screen.findByText('feature/x')).toBeInTheDocument();
    expect(await screen.findByText('· uncommitted changes')).toBeInTheDocument();
  });
});

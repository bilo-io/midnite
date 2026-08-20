import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { Project, ProjectRepo, Repo } from '@midnite/shared';

import { renderWithIntl } from '@/vitest.render-intl';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const getRepos = vi.fn();
const listProjectRepos = vi.fn();
const attachProjectRepo = vi.fn();
const detachProjectRepo = vi.fn();
const setProjectRepoPrimary = vi.fn();
const getProjectRepoStatus = vi.fn();

vi.mock('@/lib/api', () => ({
  getRepos: (...a: unknown[]) => getRepos(...a),
  listProjectRepos: (...a: unknown[]) => listProjectRepos(...a),
  attachProjectRepo: (...a: unknown[]) => attachProjectRepo(...a),
  detachProjectRepo: (...a: unknown[]) => detachProjectRepo(...a),
  setProjectRepoPrimary: (...a: unknown[]) => setProjectRepoPrimary(...a),
  getProjectRepoStatus: (...a: unknown[]) => getProjectRepoStatus(...a),
  getRepoStatus: vi.fn(),
  initRepo: vi.fn(),
}));

// No confirm mock: `renderWithIntl` already wraps in the real `ConfirmProvider`,
// so the detach tests drive the actual dialog.

import { ProjectReposPanel } from './project-repos-panel';

const project: Project = {
  id: 'p1',
  name: 'Acme',
  tag: 'ACM',
  color: '#6366f1',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const edge = (over: Partial<ProjectRepo> = {}): ProjectRepo => ({
  repoId: 'r1',
  name: 'gateway',
  path: '~/Dev/midnite/packages/gateway',
  isPrimary: true,
  attachedAt: '2026-07-01T00:00:00.000Z',
  ...over,
});

const registryRepo = (over: Partial<Repo> = {}): Repo => ({
  id: 'r1',
  name: 'gateway',
  path: '~/Dev/midnite/packages/gateway',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  ...over,
});

function setup(opts: { attached?: ProjectRepo[]; registry?: Repo[]; workDir?: string } = {}) {
  getRepos.mockResolvedValue(opts.registry ?? [registryRepo()]);
  listProjectRepos.mockResolvedValue(opts.attached ?? []);
  getProjectRepoStatus.mockResolvedValue({ exists: true, isRepo: true, branch: 'main', dirty: false });
  return renderWithIntl(
    <ProjectReposPanel project={{ ...project, workDir: opts.workDir }} />,
  );
}

describe('ProjectReposPanel (Phase 84 C)', () => {
  it('lists attached repos and marks the primary', async () => {
    setup({
      attached: [edge(), edge({ repoId: 'r2', name: 'web', path: '~/Dev/midnite/packages/web', isPrimary: false })],
      registry: [registryRepo(), registryRepo({ id: 'r2', name: 'web' })],
    });

    expect(await screen.findByText('gateway')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
    // Exactly one primary badge, and it belongs to the primary row.
    expect(screen.getAllByText('Primary')).toHaveLength(1);
  });

  it('offers "make primary" only on non-primary rows', async () => {
    setup({
      attached: [edge(), edge({ repoId: 'r2', name: 'web', isPrimary: false })],
      registry: [registryRepo(), registryRepo({ id: 'r2', name: 'web' })],
    });

    await screen.findByText('gateway');
    expect(screen.getAllByRole('button', { name: 'Make primary' })).toHaveLength(1);
  });

  it('promotes a repo and renders the list the server returns', async () => {
    setProjectRepoPrimary.mockResolvedValue([
      edge({ isPrimary: false }),
      edge({ repoId: 'r2', name: 'web', isPrimary: true }),
    ]);
    setup({
      attached: [edge(), edge({ repoId: 'r2', name: 'web', isPrimary: false })],
      registry: [registryRepo(), registryRepo({ id: 'r2', name: 'web' })],
    });

    await screen.findByText('gateway');
    fireEvent.click(screen.getByRole('button', { name: 'Make primary' }));

    await waitFor(() => expect(setProjectRepoPrimary).toHaveBeenCalledWith('p1', 'r2'));
    // The promoted row is now the one without the button.
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Make primary' })).toHaveLength(1),
    );
  });

  it('only offers repos that are not already attached', async () => {
    setup({
      attached: [edge()],
      registry: [registryRepo(), registryRepo({ id: 'r2', name: 'web' })],
    });

    await screen.findByText('gateway');
    const picker = screen.getByRole('combobox', { name: 'Repository to attach' });
    const options = [...picker.querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toContain('web');
    expect(options).not.toContain('gateway');
  });

  it('attaches the chosen repo', async () => {
    attachProjectRepo.mockResolvedValue([edge({ repoId: 'r2', name: 'web' })]);
    setup({ attached: [], registry: [registryRepo({ id: 'r2', name: 'web' })] });

    await waitFor(() => expect(getRepos).toHaveBeenCalled());
    fireEvent.change(screen.getByRole('combobox', { name: 'Repository to attach' }), {
      target: { value: 'r2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Attach' }));

    await waitFor(() => expect(attachProjectRepo).toHaveBeenCalledWith('p1', { repoId: 'r2' }));
    expect(await screen.findByText('web')).toBeInTheDocument();
  });

  it('detaches once the confirm dialog is accepted', async () => {
    detachProjectRepo.mockResolvedValue([]);
    setup({ attached: [edge()] });

    await screen.findByText('gateway');
    fireEvent.click(screen.getByRole('button', { name: 'Detach gateway' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Detach' }));
    await waitFor(() => expect(detachProjectRepo).toHaveBeenCalledWith('p1', 'r1'));
  });

  it('warns that the working directory will move when detaching the primary', async () => {
    setup({
      attached: [edge(), edge({ repoId: 'r2', name: 'web', isPrimary: false })],
      registry: [registryRepo(), registryRepo({ id: 'r2', name: 'web' })],
    });

    await screen.findByText('gateway');
    fireEvent.click(screen.getByRole('button', { name: 'Detach gateway' }));

    expect(await screen.findByText(/working directory will move/i)).toBeInTheDocument();
  });

  it('leaves the repo attached when the confirm is cancelled', async () => {
    setup({ attached: [edge()] });

    await screen.findByText('gateway');
    fireEvent.click(screen.getByRole('button', { name: 'Detach gateway' }));
    fireEvent.click(await screen.findByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(detachProjectRepo).not.toHaveBeenCalled());
  });

  it('names the fallback folder in the empty state so the effective directory is never a mystery', async () => {
    setup({ attached: [], workDir: '~/Dev/legacy' });
    expect(await screen.findByText(/~\/Dev\/legacy/)).toBeInTheDocument();
  });
});

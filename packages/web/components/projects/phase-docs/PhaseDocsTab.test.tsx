import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PhaseDoc, Repo } from '@midnite/shared';

const getRepos = vi.fn();
const listPhaseDocs = vi.fn();
const getPhaseDoc = vi.fn();
const createPhaseDoc = vi.fn();
const updatePhaseDoc = vi.fn();
const deletePhaseDoc = vi.fn();

// Define ApiError inside the factory (vi.mock is hoisted, so a top-level class
// would be in the temporal dead zone). Re-imported below for the conflict test —
// the component's `instanceof ApiError` must see this same class.
vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    readonly status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    getRepos: (...a: unknown[]) => getRepos(...a),
    listPhaseDocs: (...a: unknown[]) => listPhaseDocs(...a),
    getPhaseDoc: (...a: unknown[]) => getPhaseDoc(...a),
    createPhaseDoc: (...a: unknown[]) => createPhaseDoc(...a),
    updatePhaseDoc: (...a: unknown[]) => updatePhaseDoc(...a),
    deletePhaseDoc: (...a: unknown[]) => deletePhaseDoc(...a),
  };
});

import { ApiError } from '@/lib/api';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { PhaseDocsTab } from './PhaseDocsTab';

const REPOS: Repo[] = [
  { id: 'r1', name: 'web', path: '~/Dev/web', ownerRepo: 'me/web', createdAt: '', updatedAt: '' },
  { id: 'r2', name: 'local', path: '~/Dev/local', createdAt: '', updatedAt: '' },
];

const DOC: PhaseDoc = {
  name: 'auth.md',
  path: '.midnite/phases/auth.md',
  sha: 'sha-1',
  content: '# Auth',
};

function renderTab() {
  render(
    <ConfirmProvider>
      <PhaseDocsTab projectId="p1" />
    </ConfirmProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getRepos.mockResolvedValue(REPOS);
  listPhaseDocs.mockResolvedValue([DOC]);
  getPhaseDoc.mockResolvedValue(DOC);
  createPhaseDoc.mockResolvedValue(DOC);
  updatePhaseDoc.mockResolvedValue(DOC);
});

async function pickRepo() {
  renderTab();
  await screen.findByRole('option', { name: /me\/web/ });
  fireEvent.change(screen.getByLabelText('Repo'), { target: { value: 'r1' } });
}

describe('PhaseDocsTab', () => {
  it('only offers repos with a GitHub owner/repo slug', async () => {
    renderTab();
    await screen.findByRole('option', { name: /me\/web/ });
    expect(screen.queryByRole('option', { name: /local/ })).toBeNull();
  });

  it('lists the picked repo’s phase docs', async () => {
    await pickRepo();
    expect(await screen.findByText('auth.md')).toBeInTheDocument();
    expect(listPhaseDocs).toHaveBeenCalledWith('p1', 'r1');
  });

  it('opens a doc and saves with a PUT carrying the sha', async () => {
    await pickRepo();
    fireEvent.click(await screen.findByText('auth.md'));
    await waitFor(() => expect(getPhaseDoc).toHaveBeenCalledWith('p1', 'r1', 'auth.md'));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updatePhaseDoc).toHaveBeenCalledWith('p1', 'r1', 'auth.md', {
        content: '# Auth',
        sha: 'sha-1',
      }),
    );
  });

  it('creates a new doc via POST', async () => {
    await pickRepo();
    fireEvent.click(await screen.findByRole('button', { name: /New phase doc/ }));
    fireEvent.change(screen.getByLabelText('Phase doc name'), {
      target: { value: 'Billing' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(createPhaseDoc).toHaveBeenCalledWith('p1', 'r1', {
        name: 'Billing',
        content: expect.any(String),
      }),
    );
  });

  it('shows a reload-and-retry notice on a 409 conflict', async () => {
    updatePhaseDoc.mockRejectedValueOnce(new ApiError('stale', 409));
    await pickRepo();
    fireEvent.click(await screen.findByText('auth.md'));
    await waitFor(() => expect(getPhaseDoc).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/changed on the remote/i)).toBeInTheDocument();
  });
});

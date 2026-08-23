import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { GithubConnection } from '@midnite/shared';

import { renderWithIntl } from '@/vitest.render-intl';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

/**
 * The card honours GitHub's poll interval with a 1s floor, which is longer than
 * RTL's default 1s findBy budget — so the poll-driven assertions drive the clock
 * rather than racing it.
 */
async function tickPoll() {
  await act(async () => {}); // let beginConnect settle so the timer is scheduled
  await act(async () => {
    vi.advanceTimersByTime(1100);
  });
  await act(async () => {}); // let the poll's promise resolve
}

const getGithubConnection = vi.fn();
const startGithubDeviceConnect = vi.fn();
const pollGithubDeviceConnect = vi.fn();
const disconnectGithub = vi.fn();

vi.mock('@/lib/api', () => ({
  getGithubConnection: (...a: unknown[]) => getGithubConnection(...a),
  startGithubDeviceConnect: (...a: unknown[]) => startGithubDeviceConnect(...a),
  pollGithubDeviceConnect: (...a: unknown[]) => pollGithubDeviceConnect(...a),
  disconnectGithub: (...a: unknown[]) => disconnectGithub(...a),
}));

import { GithubConnectionCard } from './github-connection-card';

const connected = (over: Partial<GithubConnection> = {}): GithubConnection => ({
  connected: true,
  source: 'oauth',
  login: 'octocat',
  scopes: ['repo', 'project'],
  ...over,
});

const START = {
  deviceAuthId: 'handle-1',
  userCode: 'WXYZ-9876',
  verificationUri: 'https://github.com/login/device',
  expiresInSeconds: 900,
  intervalSeconds: 0,
};

describe('GithubConnectionCard (Phase 84 G)', () => {
  it('offers to connect when nothing resolves', async () => {
    getGithubConnection.mockResolvedValue({ connected: false, scopes: [] });
    renderWithIntl(<GithubConnectionCard />);
    expect(await screen.findByRole('button', { name: 'Connect GitHub' })).toBeInTheDocument();
  });

  it('shows the user code and a link to GitHub once a device flow starts', async () => {
    getGithubConnection.mockResolvedValue({ connected: false, scopes: [] });
    startGithubDeviceConnect.mockResolvedValue(START);
    pollGithubDeviceConnect.mockResolvedValue({ status: 'pending' });
    renderWithIntl(<GithubConnectionCard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect GitHub' }));

    expect(await screen.findByTestId('device-user-code')).toHaveTextContent('WXYZ-9876');
    expect(screen.getByRole('link', { name: /open github/i })).toHaveAttribute(
      'href',
      'https://github.com/login/device',
    );
  });

  it('re-reads the connection once the poll completes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getGithubConnection
      .mockResolvedValueOnce({ connected: false, scopes: [] })
      .mockResolvedValue(connected());
    startGithubDeviceConnect.mockResolvedValue(START);
    pollGithubDeviceConnect.mockResolvedValue({ status: 'complete', credential: { id: 'c1' } });
    renderWithIntl(<GithubConnectionCard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect GitHub' }));
    await tickPoll();

    expect(await screen.findByText('octocat')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it.each([
    ['expired', /expired before it was used/i],
    ['denied', /declined at GitHub/i],
  ] as const)('treats %s as a retryable outcome, not an error', async (status, copy) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getGithubConnection.mockResolvedValue({ connected: false, scopes: [] });
    startGithubDeviceConnect.mockResolvedValue(START);
    pollGithubDeviceConnect.mockResolvedValue({ status });
    renderWithIntl(<GithubConnectionCard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect GitHub' }));
    await tickPoll();

    expect(await screen.findByText(copy)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    vi.useRealTimers();
  });

  // The source discriminator is the point of the card: these three are not
  // interchangeable, and only one of them is the user's to remove.
  it('offers disconnect for a personal connection', async () => {
    getGithubConnection.mockResolvedValue(connected({ source: 'oauth' }));
    renderWithIntl(<GithubConnectionCard />);
    expect(await screen.findByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
  });

  it.each([
    ['pat', /shared token configured for the whole install/i],
    ['gh-cli', /`gh` CLI signed in on the machine/i],
  ] as const)('refuses to disconnect a %s token and explains why', async (source, copy) => {
    getGithubConnection.mockResolvedValue(connected({ source }));
    renderWithIntl(<GithubConnectionCard />);

    expect(await screen.findByText(copy)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull();
  });

  it('says plainly when the grant could not be revoked at GitHub', async () => {
    getGithubConnection.mockResolvedValueOnce(connected()).mockResolvedValue({
      connected: false,
      scopes: [],
    });
    disconnectGithub.mockResolvedValue({
      disconnected: true,
      revokedAtProvider: false,
      manageUrl: 'https://github.com/settings/applications',
    });
    renderWithIntl(<GithubConnectionCard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Disconnect' }));
    // The confirm dialog's button shares the card button's label — scope to the dialog.
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Disconnect' }));

    await waitFor(() => expect(disconnectGithub).toHaveBeenCalled());
    expect(await screen.findByText(/could not be revoked at GitHub/i)).toBeInTheDocument();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';

import { renderWithIntl } from '@/vitest.render-intl';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const getGithubConnection = vi.fn();
vi.mock('@/lib/api', () => ({
  getGithubConnection: (...a: unknown[]) => getGithubConnection(...a),
}));

import { GithubConnectBanner } from './github-connect-banner';

describe('GithubConnectBanner (Phase 84 G)', () => {
  it('prompts when nothing is connected', async () => {
    getGithubConnection.mockResolvedValue({ connected: false, scopes: [] });
    renderWithIntl(<GithubConnectBanner />);

    expect(await screen.findByRole('link', { name: /connect github/i })).toHaveAttribute(
      'href',
      '/settings/integrations',
    );
  });

  // A shared PAT or the host's gh CLI both make the repo browser work, so nagging
  // those users to "connect" would be wrong.
  it.each(['oauth', 'pat', 'gh-cli'] as const)(
    'stays silent when a %s token already resolves',
    async (source) => {
      getGithubConnection.mockResolvedValue({ connected: true, source, scopes: [] });
      const { container } = renderWithIntl(<GithubConnectBanner />);

      await waitFor(() => expect(getGithubConnection).toHaveBeenCalled());
      expect(container).toBeEmptyDOMElement();
    },
  );

  it('stays silent when the probe fails — a failed check is not evidence of anything', async () => {
    getGithubConnection.mockRejectedValue(new Error('gateway down'));
    const { container } = renderWithIntl(<GithubConnectBanner />);

    await waitFor(() => expect(getGithubConnection).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

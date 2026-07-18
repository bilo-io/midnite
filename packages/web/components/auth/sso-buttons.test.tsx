import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSsoProviders = vi.fn();
vi.mock('@/lib/api', () => ({
  fetchSsoProviders: () => fetchSsoProviders(),
  ssoStartUrl: (provider: string, redirect?: string) =>
    `http://gw.test/auth/sso/${provider}/start${redirect ? `?redirect=${redirect}` : ''}`,
}));

import { SsoButtons } from './sso-buttons';

describe('SsoButtons', () => {
  beforeEach(() => {
    fetchSsoProviders.mockReset();
  });

  it('renders an anchor per configured provider with the correct start URL', async () => {
    fetchSsoProviders.mockResolvedValue(['google', 'github']);
    render(<SsoButtons redirect="/board" />);

    const google = await screen.findByTestId('sso-google');
    expect(google).toHaveAttribute('href', 'http://gw.test/auth/sso/google/start?redirect=/board');
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();

    const github = screen.getByTestId('sso-github');
    expect(github).toHaveAttribute('href', 'http://gw.test/auth/sso/github/start?redirect=/board');
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
  });

  it('renders only the configured providers', async () => {
    fetchSsoProviders.mockResolvedValue(['google']);
    render(<SsoButtons />);
    await screen.findByTestId('sso-google');
    expect(screen.queryByTestId('sso-github')).toBeNull();
  });

  it('falls back to showing both providers when the gateway reports none', async () => {
    fetchSsoProviders.mockResolvedValue([]);
    render(<SsoButtons />);
    await waitFor(() => expect(fetchSsoProviders).toHaveBeenCalled());
    // Always visible + wired: an unconfigured provider click gets a friendly
    // sso_error from the gateway rather than a missing button.
    expect(screen.getByTestId('sso-google')).toBeInTheDocument();
    expect(screen.getByTestId('sso-github')).toBeInTheDocument();
  });

  it('shows both providers immediately while the providers fetch is pending', () => {
    fetchSsoProviders.mockReturnValue(new Promise(() => {}));
    render(<SsoButtons />);
    expect(screen.getByTestId('sso-google')).toBeInTheDocument();
    expect(screen.getByTestId('sso-github')).toBeInTheDocument();
  });
});

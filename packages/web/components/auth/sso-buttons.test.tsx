import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSsoProviders = vi.fn();
vi.mock('@/lib/api', () => ({
  fetchSsoProviders: () => fetchSsoProviders(),
  ssoStartUrl: (provider: string, redirect?: string) =>
    `http://gw.test/auth/sso/${provider}/start${redirect ? `?redirect=${redirect}` : ''}`,
}));

import { SsoButtons } from './sso-buttons';
import { LAST_LOGIN_METHOD_KEY } from '@/lib/last-login-method';

describe('SsoButtons', () => {
  beforeEach(() => {
    fetchSsoProviders.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
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

  it('highlights the last-used provider with a lit glow + tag', async () => {
    window.localStorage.setItem(LAST_LOGIN_METHOD_KEY, 'github');
    fetchSsoProviders.mockResolvedValue(['google', 'github']);
    render(<SsoButtons />);

    const github = await screen.findByTestId('sso-github');
    expect(github.closest('.gradient-border')).toHaveClass('gradient-border--always');
    expect(screen.getByText('last')).toBeInTheDocument();
    // Only the last-used button is lit.
    const google = screen.getByTestId('sso-google');
    expect(google.closest('.gradient-border')).not.toHaveClass('gradient-border--always');
  });

  it('records the provider as last-used on click', async () => {
    fetchSsoProviders.mockResolvedValue(['google', 'github']);
    render(<SsoButtons />);
    const google = await screen.findByTestId('sso-google');
    // jsdom can't navigate — swallow the anchor's default before clicking.
    google.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(google);
    expect(window.localStorage.getItem(LAST_LOGIN_METHOD_KEY)).toBe('google');
  });
});

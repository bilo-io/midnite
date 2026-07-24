import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSsoProviders = vi.fn();
vi.mock('@/lib/api', () => ({
  fetchSsoProviders: () => fetchSsoProviders(),
  ssoStartUrl: (provider: string, redirect?: string) =>
    `http://gw.test/auth/sso/${provider}/start${redirect ? `?redirect=${redirect}` : ''}`,
  startSsoDeviceAuth: vi.fn(() => new Promise(() => {})),
  pollSsoDeviceAuth: vi.fn(),
  ssoErrorMessage: () => null,
}));
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ applySession: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { SsoButtons } from './sso-buttons';
import { LAST_LOGIN_METHOD_KEY } from '@/lib/last-login-method';
import { withLocale } from '@/lib/test-locale-wrapper';

/** The gateway's two-list shape: redirect-flow `providers` + secretless `deviceProviders`. */
const options = (providers: string[], deviceProviders: string[] = []) => ({
  providers,
  deviceProviders,
});

describe('SsoButtons', () => {
  beforeEach(() => {
    fetchSsoProviders.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders an anchor per configured provider with the correct start URL', async () => {
    fetchSsoProviders.mockResolvedValue(options(['google', 'github']));
    render(withLocale(<SsoButtons redirect="/board" />));

    const google = await screen.findByTestId('sso-google');
    expect(google).toHaveAttribute('href', 'http://gw.test/auth/sso/google/start?redirect=/board');
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();

    const github = screen.getByTestId('sso-github');
    expect(github).toHaveAttribute('href', 'http://gw.test/auth/sso/github/start?redirect=/board');
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
  });

  it('renders only the configured providers', async () => {
    fetchSsoProviders.mockResolvedValue(options(['google']));
    render(withLocale(<SsoButtons />));
    await screen.findByTestId('sso-google');
    expect(screen.queryByTestId('sso-github')).toBeNull();
  });

  it('falls back to showing both providers when the gateway reports none', async () => {
    fetchSsoProviders.mockResolvedValue(options([]));
    render(withLocale(<SsoButtons />));
    await waitFor(() => expect(fetchSsoProviders).toHaveBeenCalled());
    // Always visible + wired: an unconfigured provider click gets a friendly
    // sso_error from the gateway rather than a missing button.
    expect(screen.getByTestId('sso-google')).toBeInTheDocument();
    expect(screen.getByTestId('sso-github')).toBeInTheDocument();
  });

  it('shows both providers immediately while the providers fetch is pending', () => {
    fetchSsoProviders.mockReturnValue(new Promise(() => {}));
    render(withLocale(<SsoButtons />));
    expect(screen.getByTestId('sso-google')).toBeInTheDocument();
    expect(screen.getByTestId('sso-github')).toBeInTheDocument();
  });

  it('highlights the last-used provider with a lit glow + tag', async () => {
    window.localStorage.setItem(LAST_LOGIN_METHOD_KEY, 'github');
    fetchSsoProviders.mockResolvedValue(options(['google', 'github']));
    render(withLocale(<SsoButtons />));

    const github = await screen.findByTestId('sso-github');
    expect(github.closest('.gradient-border')).toHaveClass('gradient-border--always');
    expect(screen.getByText('last')).toBeInTheDocument();
    // Only the last-used button is lit.
    const google = screen.getByTestId('sso-google');
    expect(google.closest('.gradient-border')).not.toHaveClass('gradient-border--always');
  });

  it('records the provider as last-used on click', async () => {
    fetchSsoProviders.mockResolvedValue(options(['google', 'github']));
    render(withLocale(<SsoButtons />));
    const google = await screen.findByTestId('sso-google');
    // jsdom can't navigate — swallow the anchor's default before clicking.
    google.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(google);
    expect(window.localStorage.getItem(LAST_LOGIN_METHOD_KEY)).toBe('google');
  });

  it('renders a device-flow provider as a button that opens the code panel', async () => {
    fetchSsoProviders.mockResolvedValue(options(['google'], ['github']));
    render(withLocale(<SsoButtons />));

    // Wait past the pre-fetch fallback render (both providers as anchors) for the
    // resolved state, where the device provider becomes a same-page button.
    await waitFor(() => expect(screen.getByTestId('sso-github').tagName).toBe('BUTTON'));
    const github = screen.getByTestId('sso-github');
    expect(github).not.toHaveAttribute('href');

    fireEvent.click(github);
    // The buttons are swapped out for the inline device panel (starting state).
    expect(screen.queryByTestId('sso-google')).toBeNull();
    expect(screen.getByText('Getting your sign-in code…')).toBeInTheDocument();
  });
});

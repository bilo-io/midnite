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

  it('renders nothing when SSO is not configured', async () => {
    fetchSsoProviders.mockResolvedValue([]);
    const { container } = render(<SsoButtons />);
    await waitFor(() => expect(fetchSsoProviders).toHaveBeenCalled());
    expect(container.querySelector('[data-testid^="sso-"]')).toBeNull();
    expect(container.textContent).not.toContain('or');
  });
});

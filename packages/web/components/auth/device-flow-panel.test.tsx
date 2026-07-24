import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const startSsoDeviceAuth = vi.fn();
const pollSsoDeviceAuth = vi.fn();
vi.mock('@/lib/api', () => ({
  startSsoDeviceAuth: (...args: unknown[]) => startSsoDeviceAuth(...args),
  pollSsoDeviceAuth: (...args: unknown[]) => pollSsoDeviceAuth(...args),
  ssoErrorMessage: (code: string) => (code === 'not_allowed' ? 'Not permitted.' : null),
}));

const applySession = vi.fn(async () => {});
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ applySession }),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { DeviceFlowPanel } from './device-flow-panel';
import { LAST_LOGIN_METHOD_KEY } from '@/lib/last-login-method';
import { withLocale } from '@/lib/test-locale-wrapper';

/** A start payload with a near-instant poll cadence so real timers stay fast. */
const start = {
  deviceAuthId: 'da-1',
  userCode: 'ABCD-1234',
  verificationUri: 'https://github.com/login/device',
  expiresInSeconds: 900,
  intervalSeconds: 0.01,
};

describe('DeviceFlowPanel', () => {
  beforeEach(() => {
    startSsoDeviceAuth.mockReset();
    pollSsoDeviceAuth.mockReset();
    applySession.mockClear();
    push.mockClear();
    window.localStorage.clear();
  });

  it('shows the user code and the verification link once the start resolves', async () => {
    startSsoDeviceAuth.mockResolvedValue(start);
    pollSsoDeviceAuth.mockResolvedValue({ status: 'pending' });
    render(withLocale(<DeviceFlowPanel provider="github" onCancel={() => {}} />));

    expect(await screen.findByTestId('device-user-code')).toHaveTextContent('ABCD-1234');
    expect(screen.getByRole('link', { name: /verification page/i })).toHaveAttribute(
      'href',
      'https://github.com/login/device',
    );
  });

  it('applies the session and heads home when the poll completes', async () => {
    const auth = { accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } };
    startSsoDeviceAuth.mockResolvedValue(start);
    pollSsoDeviceAuth.mockResolvedValue({ status: 'complete', auth });
    render(withLocale(<DeviceFlowPanel provider="github" onCancel={() => {}} />));

    await waitFor(() => expect(applySession).toHaveBeenCalledWith(auth));
    expect(push).toHaveBeenCalledWith('/');
    expect(window.localStorage.getItem(LAST_LOGIN_METHOD_KEY)).toBe('github');
  });

  it('shows the denial copy with a retry when the user refuses the grant', async () => {
    startSsoDeviceAuth.mockResolvedValue(start);
    pollSsoDeviceAuth.mockResolvedValue({ status: 'denied' });
    render(withLocale(<DeviceFlowPanel provider="github" onCancel={() => {}} />));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /new code/i });

    // Retry starts a fresh device auth.
    startSsoDeviceAuth.mockClear();
    fireEvent.click(retry);
    await waitFor(() => expect(startSsoDeviceAuth).toHaveBeenCalledWith('github'));
  });

  it('surfaces a provisioning refusal via the shared sso_error copy', async () => {
    startSsoDeviceAuth.mockResolvedValue(start);
    pollSsoDeviceAuth.mockResolvedValue({ status: 'error', code: 'not_allowed' });
    render(withLocale(<DeviceFlowPanel provider="github" onCancel={() => {}} />));

    expect(await screen.findByRole('alert')).toHaveTextContent('Not permitted.');
  });

  it('falls back to a friendly failure when the start itself fails', async () => {
    startSsoDeviceAuth.mockRejectedValue(new Error('503'));
    render(withLocale(<DeviceFlowPanel provider="github" onCancel={() => {}} />));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('lets the user back out to the sign-in options', async () => {
    startSsoDeviceAuth.mockResolvedValue(start);
    pollSsoDeviceAuth.mockResolvedValue({ status: 'pending' });
    const onCancel = vi.fn();
    render(withLocale(<DeviceFlowPanel provider="github" onCancel={onCancel} />));

    fireEvent.click(await screen.findByRole('button', { name: /back to sign-in/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});

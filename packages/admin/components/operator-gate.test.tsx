import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@midnite/ui/theme';
import type { User } from '@midnite/shared';
import type { OperatorProbe } from '@/lib/api';
import { OperatorGate } from './operator-gate';

// Stub the SSO login screen (its own flow is tested elsewhere) so the gate's
// "not authenticated ⇒ login" branch is asserted without the provider fetch.
vi.mock('@/components/login-screen', () => ({
  LoginScreen: () => <div>login gate</div>,
}));

// The gate reads the session from admin's auth context and the operator verdict
// from the `/admin/overview` probe. Mock both seams; `useIsOperator` runs for real
// on top of them.
const useAuthMock = vi.fn();
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => useAuthMock() as unknown,
}));

const probeOperatorMock = vi.fn<() => Promise<OperatorProbe>>();
vi.mock('@/lib/api', () => ({
  probeOperator: () => probeOperatorMock(),
}));

const USER: User = {
  id: 'usr_1',
  email: 'ada@example.com',
  name: 'Ada Operator',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderGate() {
  return render(
    <ThemeProvider>
      <OperatorGate>
        <div>console body</div>
      </OperatorGate>
    </ThemeProvider>,
  );
}

describe('OperatorGate', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    probeOperatorMock.mockReset();
  });

  it('renders the login screen when the visitor is not authenticated', () => {
    useAuthMock.mockReturnValue({ user: null, isLoading: false, logout: vi.fn() });
    renderGate();
    expect(screen.getByText('login gate')).toBeInTheDocument();
    expect(screen.queryByText('console body')).not.toBeInTheDocument();
  });

  it('blocks an authenticated non-operator (probe 403) with a sign-out', async () => {
    useAuthMock.mockReturnValue({ user: USER, isLoading: false, logout: vi.fn() });
    probeOperatorMock.mockResolvedValue('forbidden');
    renderGate();
    expect(await screen.findByText(/isn.t an operator/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByText('console body')).not.toBeInTheDocument();
  });

  it('renders the app for an operator (probe 200)', async () => {
    useAuthMock.mockReturnValue({ user: USER, isLoading: false, logout: vi.fn() });
    probeOperatorMock.mockResolvedValue('operator');
    renderGate();
    expect(await screen.findByText('console body')).toBeInTheDocument();
    expect(screen.queryByText('login gate')).not.toBeInTheDocument();
  });
});

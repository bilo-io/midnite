import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@midnite/shared';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const authState: { user: User | null; isLoading: boolean; jwtEnabled: boolean } = {
  user: null,
  isLoading: false,
  jwtEnabled: true,
};
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => authState }));

import { AuthGate } from './auth-gate';

const user = (): User => ({ id: 'u1', email: 'a@x.com', name: 'A', createdAt: 't', updatedAt: 't' });
const child = () => <div data-testid="protected">app</div>;

describe('AuthGate', () => {
  beforeEach(() => {
    replace.mockReset();
    Object.assign(authState, { user: null, isLoading: false, jwtEnabled: true });
  });

  it('redirects to /login and withholds children when auth is required and nobody is signed in', () => {
    render(<AuthGate>{child()}</AuthGate>);
    expect(replace).toHaveBeenCalledWith('/login');
    expect(screen.queryByTestId('protected')).toBeNull();
  });

  it('withholds children and does not redirect while the session restore is still loading', () => {
    authState.isLoading = true;
    render(<AuthGate>{child()}</AuthGate>);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('protected')).toBeNull();
  });

  it('renders children without redirect when JWT auth is disabled (local mode)', () => {
    authState.jwtEnabled = false;
    render(<AuthGate>{child()}</AuthGate>);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('renders children for a signed-in user', () => {
    authState.user = user();
    render(<AuthGate>{child()}</AuthGate>);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });
});

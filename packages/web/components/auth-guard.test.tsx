import { render } from '@testing-library/react';
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

import { AuthGuard } from './auth-guard';

const user = (): User => ({ id: 'u1', email: 'a@x.com', name: 'A', createdAt: 't', updatedAt: 't' });

describe('AuthGuard', () => {
  beforeEach(() => {
    replace.mockReset();
    Object.assign(authState, { user: null, isLoading: false, jwtEnabled: true });
  });

  it('redirects to /login when auth is required and nobody is signed in', () => {
    render(<AuthGuard />);
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('does not redirect while the session restore is still loading', () => {
    authState.isLoading = true;
    render(<AuthGuard />);
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not redirect when JWT auth is disabled (local mode)', () => {
    authState.jwtEnabled = false;
    render(<AuthGuard />);
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not redirect a signed-in user', () => {
    authState.user = user();
    render(<AuthGuard />);
    expect(replace).not.toHaveBeenCalled();
  });
});

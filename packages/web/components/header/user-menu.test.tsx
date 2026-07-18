import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Team, User } from '@midnite/shared';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const authState: {
  user: User | null;
  teams: Team[];
  activeTeamId: string | null;
  setActiveTeam: (id: string | null) => void;
  logout: () => Promise<void>;
} = {
  user: null,
  teams: [],
  activeTeamId: null,
  setActiveTeam: vi.fn(),
  logout: vi.fn(async () => {}),
};
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => authState }));

import { UserMenu } from './user-menu';

const aUser = (): User => ({ id: 'u1', email: 'ada@x.com', name: 'Ada Lovelace', createdAt: 't', updatedAt: 't' });

afterEach(cleanup);
beforeEach(() => {
  push.mockReset();
  Object.assign(authState, { user: null, teams: [], activeTeamId: null });
});

describe('UserMenu', () => {
  it('renders a generic-avatar account button even when signed out', () => {
    render(<UserMenu />);
    // The button is always present (not null) so the header corner stays consistent.
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
  });

  it('offers a Log in option when signed out', () => {
    render(<UserMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByText('Not signed in')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Log in/i })).toHaveAttribute('href', '/login');
  });

  it('shows the signed-in email and sign-out when a user is present', () => {
    authState.user = aUser();
    render(<UserMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByText('ada@x.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Sign out/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Log in/i })).toBeNull();
  });
});

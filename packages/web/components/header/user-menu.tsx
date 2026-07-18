'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, LogOut, User, Users } from 'lucide-react';

import { Avatar } from '@/components/avatar';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

import { useHeaderDropdown } from './use-header-dropdown';

/**
 * Header-actions user menu: the avatar (SSO image or initials) opening a dropdown
 * with the signed-in email, profile/team links, a workspace switcher (personal
 * vs. team), and sign out. Renders nothing when there's no session (local /
 * JWT-disabled mode) so the cluster simply omits the avatar.
 */
export function UserMenu() {
  const { user, teams, activeTeamId, setActiveTeam, logout } = useAuth();
  const router = useRouter();
  const { open, toggle, setOpen, rootRef } = useHeaderDropdown();

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/login');
  };

  return (
    <div ref={rootRef} className="group relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring',
          open && 'ring-2 ring-ring',
        )}
      >
        <Avatar
          name={user.name}
          src={user.avatarUrl}
          seed={user.email}
          className="h-8 w-8 text-xs ring-1 ring-border/60"
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-2xl"
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <Avatar
              name={user.name}
              src={user.avatarUrl}
              seed={user.email}
              className="h-9 w-9 text-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="my-1 h-px bg-border/60" />

          <Link
            href="/settings/profile"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground/90 transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            Profile
          </Link>
          <Link
            href="/settings/team"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground/90 transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            Team
          </Link>

          {teams.length > 0 ? (
            <>
              <div className="my-1 h-px bg-border/60" />
              <p className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Workspace
              </p>
              {teams.map((team) => {
                const active = team.id === activeTeamId;
                return (
                  <button
                    key={team.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setActiveTeam(team.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground/90 transition-colors hover:bg-accent/60 hover:text-foreground"
                  >
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                      {active ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                    </span>
                    <span className="truncate">{team.name}</span>
                  </button>
                );
              })}
            </>
          ) : null}

          <div className="my-1 h-px bg-border/60" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground/90 transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Avatar + name chip that opens a profile/logout dropdown. */
export function UserNav({ expanded }: { expanded?: boolean }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/login');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        aria-haspopup="menu"
        className={cn(
          'group flex h-9 items-center gap-2.5 rounded-md transition-colors',
          expanded ? 'w-full px-2.5' : 'w-9 justify-center',
          'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {initials(user.name)}
        </span>
        {expanded && <span className="truncate text-sm">{user.name}</span>}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 min-w-[180px] rounded-md border border-border bg-popover py-1 shadow-lg',
            expanded
              ? 'bottom-full left-0 mb-1'
              : 'bottom-0 left-full ml-2',
          )}
        >
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Link
            href="/settings/profile"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent/60 hover:text-foreground"
          >
            <User className="h-3.5 w-3.5" />
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent/60 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

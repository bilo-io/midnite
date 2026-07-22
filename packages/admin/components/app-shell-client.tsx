'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  FolderKanban,
  LayoutDashboard,
  Link2,
  Power,
  ScrollText,
  Settings,
  Tag,
  Users,
} from 'lucide-react';
import { AppFrame, LockScreen, useIdleTimer, type NavConfig, type NavItem, type NavLinkComponent } from '@midnite/shell';
import { ThemeToggle } from '@midnite/ui';
import { ADMIN_NAV, type AdminNavId } from '@/lib/nav-config';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_SETTINGS,
  INACTIVITY_MAX_S,
  INACTIVITY_MIN_S,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { cn } from '@/lib/utils';

// Route Next's client-side `<Link>` through the shell's injected link seam so the
// router-agnostic `<AppFrame>` still gets SPA navigation.
const NextNavLink: NavLinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
  </Link>
);

/** Pre-rendered icon per fixed nav route (the shell's `NavItem.icon` wants a node). */
const NAV_ICON: Record<AdminNavId, ReactNode> = {
  overview: <LayoutDashboard aria-hidden />,
  usage: <BarChart3 aria-hidden />,
  users: <Users aria-hidden />,
  projects: <FolderKanban aria-hidden />,
  versions: <Tag aria-hidden />,
  audit: <ScrollText aria-hidden />,
  links: <Link2 aria-hidden />,
};

const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? '0.0.0';

/**
 * The wired admin app frame (Phase 73 Theme E). Mounts the shared `<AppFrame>` from
 * `@midnite/shell` with admin's FIXED nav config (no FEATURES, no collapse — every
 * operator route always shows), Next `<Link>`, and a minimal footer cluster (theme
 * toggle · settings · lock). Simpler than web's shell client: no presence, no
 * header actions, no passcode setup — just the idle screen lock.
 */
export function AppShellClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

  const idleSeconds = Number.isFinite(settings.inactivityTimeoutS)
    ? settings.inactivityTimeoutS
    : DEFAULT_SETTINGS.inactivityTimeoutS;
  const idleTimeoutMs = Math.min(INACTIVITY_MAX_S, Math.max(INACTIVITY_MIN_S, idleSeconds)) * 1000;

  // The idle timer only arms when the screen lock is enabled and not already showing.
  useIdleTimer(idleTimeoutMs, () => setLocked(true), settings.screenLock && !locked);

  // Allow a "Lock screen" command (parity with web) to trigger the screensaver.
  useEffect(() => {
    const onLock = () => setLocked(true);
    window.addEventListener('midnite:lock-screen', onLock);
    return () => window.removeEventListener('midnite:lock-screen', onLock);
  }, []);

  const items: NavItem[] = ADMIN_NAV.map((entry) => ({
    href: entry.href,
    label: entry.label,
    icon: NAV_ICON[entry.id],
  }));

  const nav: NavConfig = {
    sections: [{ items }],
    brand: ({ expanded }) =>
      expanded ? (
        <Link href="/" aria-label="midnite operator" className="flex items-center gap-2">
          <span className="font-brand text-lg font-semibold leading-none text-foreground">midnite</span>
          <span className="rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
            v{APP_VERSION}
          </span>
        </Link>
      ) : (
        <Link href="/" aria-label="midnite operator" className="font-brand text-base font-semibold leading-none text-foreground">
          m
        </Link>
      ),
    footer: ({ expanded }) => (
      <>
        <ThemeToggle expanded={expanded} />
        <Link
          href="/settings"
          aria-label="Settings"
          aria-current={pathname === '/settings' ? 'page' : undefined}
          className={cn(
            'group relative flex h-9 items-center rounded-md transition-colors',
            expanded ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
            pathname === '/settings'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {expanded ? <span className="truncate text-sm">Settings</span> : null}
        </Link>
        <div className={cn('my-1 h-px bg-border/60', expanded ? 'w-full' : 'w-6')} />
        <button
          type="button"
          onClick={() => setLocked(true)}
          aria-label="Lock screen"
          className={cn(
            'group relative flex h-9 items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
            expanded ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
          )}
        >
          <Power className="h-4 w-4 shrink-0" />
          {expanded ? <span className="truncate text-sm">Lock</span> : null}
        </button>
      </>
    ),
  };

  return (
    <>
      <AppFrame
        nav={nav}
        activePath={pathname}
        linkComponent={NextNavLink}
        onLock={() => setLocked(true)}
        settings={{ href: '/settings', label: 'Settings', icon: <Settings aria-hidden /> }}
      >
        {children}
      </AppFrame>

      {locked ? <LockScreen onDismiss={() => setLocked(false)} /> : null}
    </>
  );
}

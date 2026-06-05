'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Columns3,
  Folder,
  LayoutDashboard,
  MessagesSquare,
  Power,
  Settings,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIdleTimer } from '@/lib/use-idle-timer';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_SETTINGS,
  INACTIVITY_MAX_S,
  INACTIVITY_MIN_S,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { ThemeToggle } from '@/components/theme-toggle';
import { Screensaver } from '@/components/screensaver';

type NavLink = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', Icon: Folder },
  { href: '/tasks', label: 'Tasks', Icon: Columns3 },
  { href: '/sessions', label: 'Sessions', Icon: MessagesSquare },
];

const PROFILE_LINK: NavLink = { href: '/profile', label: 'Profile', Icon: UserRound };
const SETTINGS_LINK: NavLink = { href: '/settings', label: 'Settings', Icon: Settings };

export function NavBar() {
  const pathname = usePathname();
  const [screensaver, setScreensaver] = useState(false);
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

  // Kick the screensaver in after the configured inactivity window; pause the
  // timer while it's already showing (it dismisses itself on the next input).
  const idleSeconds = Number.isFinite(settings.inactivityTimeoutS)
    ? settings.inactivityTimeoutS
    : DEFAULT_SETTINGS.inactivityTimeoutS;
  const idleTimeoutMs = Math.min(INACTIVITY_MAX_S, Math.max(INACTIVITY_MIN_S, idleSeconds)) * 1000;
  useIdleTimer(idleTimeoutMs, () => setScreensaver(true), !screensaver);

  const renderLink = ({ href, label, Icon }: NavLink) => {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        aria-label={label}
        className={cn(
          'group relative flex h-9 w-9 items-center justify-center rounded-md transition-colors',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        <Icon className="h-4 w-4" />
        <Tooltip>{label}</Tooltip>
      </Link>
    );
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 flex w-14 flex-col items-center border-r border-border/60 bg-background/70 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/50">
        <Link
          href="/"
          aria-label="midnite"
          className="group relative mb-4 flex h-9 w-9 items-center justify-center"
        >
          <Image
            src="/logo.PNG"
            alt="midnite"
            width={32}
            height={32}
            priority
            className="h-8 w-8 rounded-full object-cover ring-1 ring-border/60 transition-transform group-hover:scale-110"
          />
          <Tooltip>midnite</Tooltip>
        </Link>

        <nav className="flex flex-col items-center gap-1">{LINKS.map(renderLink)}</nav>

        <div className="mt-auto flex flex-col items-center gap-1">
          {renderLink(PROFILE_LINK)}
          <ThemeToggle />
          {renderLink(SETTINGS_LINK)}
          <div className="my-1 h-px w-6 bg-border/60" />
          <button
            type="button"
            onClick={() => setScreensaver(true)}
            aria-label="Screensaver"
            className="group relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <Power className="h-4 w-4" />
            <Tooltip>Screensaver</Tooltip>
          </button>
        </div>
      </aside>

      {screensaver ? <Screensaver onClose={() => setScreensaver(false)} /> : null}
    </>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

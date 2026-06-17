'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  BotMessageSquare,
  BrainCircuit,
  CirclePile,
  Folder,
  Images,
  LayoutDashboard,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Power,
  Settings,
  UserRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIdleTimer } from '@/lib/use-idle-timer';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_SETTINGS,
  INACTIVITY_MAX_S,
  INACTIVITY_MIN_S,
  NAV_W_COLLAPSED,
  NAV_W_EXPANDED,
  PASSCODE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { ThemeToggle } from '@/components/theme-toggle';
import { Screensaver } from '@/components/screensaver';
import { PasscodeSetupDialog } from '@/components/passcode-pad';

type NavLink = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', Icon: Folder },
  { href: '/memory', label: 'Memory', Icon: BrainCircuit },
  { href: '/tasks', label: 'Tasks', Icon: ListChecks },
  { href: '/sessions', label: 'Sessions', Icon: BotMessageSquare },
  { href: '/workflows', label: 'Workflows', Icon: Workflow },
  { href: '/councils', label: 'Councils', Icon: CirclePile },
  { href: '/media', label: 'Media', Icon: Images },
];

const PROFILE_LINK: NavLink = { href: '/profile', label: 'Profile', Icon: UserRound };
const AGENTS_LINK: NavLink = { href: '/agents', label: 'Agents', Icon: Bot };
const SETTINGS_LINK: NavLink = { href: '/settings', label: 'Settings', Icon: Settings };

export function NavBar() {
  const pathname = usePathname();
  // null = hidden; otherwise the reason it opened (the idle timer or a manual
  // lock), which decides whether the passcode is enforced.
  const [screensaver, setScreensaver] = useState<'idle' | 'locked' | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [settings, setSettings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const [passcode, setPasscode] = useLocalStorage<string | null>(PASSCODE_STORAGE_KEY, null);

  // `auto` collapses at rest and expands on hover/keyboard-focus (overlay, no
  // content reflow); `expanded`/`collapsed` are the locked states.
  const navMode = settings.navMode ?? DEFAULT_SETTINGS.navMode;
  const [hoverOpen, setHoverOpen] = useState(false);
  const expandedView = navMode === 'expanded' || (navMode === 'auto' && hoverOpen);
  const autoHandlers =
    navMode === 'auto'
      ? {
          onMouseEnter: () => setHoverOpen(true),
          onMouseLeave: () => setHoverOpen(false),
          onFocusCapture: () => setHoverOpen(true),
          onBlurCapture: (e: React.FocusEvent<HTMLElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHoverOpen(false);
          },
        }
      : {};

  // Only the locked-open state shifts page content; hover-expand is an overlay.
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--nav-offset',
      navMode === 'expanded' ? NAV_W_EXPANDED : NAV_W_COLLAPSED,
    );
  }, [navMode]);

  // Kick the screensaver in after the configured inactivity window; pause the
  // timer while it's already showing (it dismisses itself on the next input) or
  // while the passcode setup dialog is open.
  const idleSeconds = Number.isFinite(settings.inactivityTimeoutS)
    ? settings.inactivityTimeoutS
    : DEFAULT_SETTINGS.inactivityTimeoutS;
  const idleTimeoutMs = Math.min(INACTIVITY_MAX_S, Math.max(INACTIVITY_MIN_S, idleSeconds)) * 1000;
  useIdleTimer(
    idleTimeoutMs,
    () => setScreensaver((s) => s ?? 'idle'),
    screensaver === null && !settingUp,
  );

  // The lock button locks straight away — unless a passcode is required but none
  // has been set yet, in which case we set one up first, then lock.
  const lock = () => {
    if (settings.requirePasscode && !passcode) setSettingUp(true);
    else setScreensaver('locked');
  };

  const renderLink = ({ href, label, Icon }: NavLink) => {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        aria-label={label}
        className={cn(
          'group relative flex h-9 items-center rounded-md transition-colors',
          expandedView ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {expandedView ? <span className="truncate text-sm">{label}</span> : <Tooltip>{label}</Tooltip>}
      </Link>
    );
  };

  return (
    <>
      <aside
        {...autoHandlers}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border/60 py-3 backdrop-blur transition-[width] duration-200',
          expandedView
            ? 'w-56 items-stretch bg-background/95 px-2 shadow-xl'
            : 'w-14 items-center bg-background/70 supports-[backdrop-filter]:bg-background/50',
        )}
      >
        <div
          className={cn(
            'mb-4 flex items-center',
            expandedView ? 'justify-between gap-2 px-1' : 'justify-center',
          )}
        >
          <Link
            href="/"
            aria-label="midnite"
            className={cn(
              'group relative flex h-9 items-center',
              expandedView ? 'gap-2' : 'w-9 justify-center',
            )}
          >
            <Image
              src="/logo.PNG"
              alt="midnite"
              width={32}
              height={32}
              priority
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border/60 transition-transform group-hover:scale-110"
            />
            {expandedView ? (
              <span className="text-sm font-semibold">midnite</span>
            ) : (
              <Tooltip>midnite</Tooltip>
            )}
          </Link>
          {expandedView ? (
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  navMode: navMode === 'expanded' ? 'auto' : 'expanded',
                }))
              }
              aria-label={navMode === 'expanded' ? 'Unlock navigation' : 'Keep navigation expanded'}
              aria-pressed={navMode === 'expanded'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              {navMode === 'expanded' ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>

        <nav className={cn('flex flex-col gap-1', expandedView ? 'items-stretch' : 'items-center')}>
          {LINKS[0] ? renderLink(LINKS[0]) : null}
          <div className={cn('my-1 h-px bg-border/60', expandedView ? 'w-full' : 'w-6')} />
          {LINKS.slice(1).map(renderLink)}
        </nav>

        <div className={cn('mt-auto flex flex-col gap-1', expandedView ? 'items-stretch' : 'items-center')}>
          {renderLink(PROFILE_LINK)}
          {renderLink(AGENTS_LINK)}
          <ThemeToggle />
          {renderLink(SETTINGS_LINK)}
          <div className={cn('my-1 h-px bg-border/60', expandedView ? 'w-full' : 'w-6')} />
          <button
            type="button"
            onClick={lock}
            aria-label="Lock screen"
            className={cn(
              'group relative flex h-9 items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
              expandedView ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
            )}
          >
            <Power className="h-4 w-4 shrink-0" />
            {expandedView ? (
              <span className="truncate text-sm">{settings.requirePasscode ? 'Lock' : 'Screensaver'}</span>
            ) : (
              <Tooltip>{settings.requirePasscode ? 'Lock' : 'Screensaver'}</Tooltip>
            )}
          </button>
        </div>
      </aside>

      {settingUp ? (
        <PasscodeSetupDialog
          onComplete={(code) => {
            setPasscode(code);
            setSettingUp(false);
            setScreensaver('locked');
          }}
          onCancel={() => setSettingUp(false)}
        />
      ) : null}

      {screensaver ? (
        <Screensaver locked={screensaver === 'locked'} onClose={() => setScreensaver(null)} />
      ) : null}
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

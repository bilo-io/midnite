'use client';

import { Fragment, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Power,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEATURES, isFeatureEnabled } from '@/lib/features';
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
import { NotificationCenter } from '@/components/notification-center';
import { ApprovalsDrawer } from '@/components/approvals-drawer';
import { Screensaver } from '@/components/screensaver';
import { PasscodeSetupDialog } from '@/components/passcode-pad';
import { Wordmark } from '@/components/wordmark';
import { ConnectionStatus, ConnectionToaster } from '@/components/connection-status';
import { MobileNav } from '@/components/mobile-nav';

type NavLink = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

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

  // The top nav is the enabled feature set; `dashboard` keeps its lead position
  // with a divider before the rest.
  const dashboardEnabled = isFeatureEnabled(settings.features, 'dashboard');
  const otherFeatures = FEATURES.slice(1).filter((f) => isFeatureEnabled(settings.features, f.key));
  // Enabled surfaces in nav order — the mobile bottom-tab bar renders from the
  // same list the sidebar does (dashboard first when enabled).
  const navFeatures = [...(dashboardEnabled ? [FEATURES[0]!] : []), ...otherFeatures];

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

  // Allow the command palette's "Lock screen" command to trigger the screensaver
  // without needing direct access to this component's state.
  useEffect(() => {
    const onLock = () => lock();
    window.addEventListener('midnite:lock-screen', onLock);
    return () => window.removeEventListener('midnite:lock-screen', onLock);
    // lock is stable across renders (no deps change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.requirePasscode, passcode]);

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
          // Hidden on phones (the bottom-tab bar takes over below `md`); the
          // icon-rail/expanded states stay for tablet and desktop.
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/60 py-3 backdrop-blur transition-[width] duration-200 md:flex',
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
            {expandedView ? <Wordmark /> : <Tooltip>midnite</Tooltip>}
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
          {dashboardEnabled ? renderLink(FEATURES[0]!) : null}
          {dashboardEnabled && otherFeatures.length ? (
            <div className={cn('my-1 h-px bg-border/60', expandedView ? 'w-full' : 'w-6')} />
          ) : null}
          {otherFeatures.map((f) => (
            <Fragment key={f.key}>
              {renderLink(f)}
              {/* Group the work surfaces (Sessions onward) apart from Tasks. */}
              {f.key === 'tasks' && isFeatureEnabled(settings.features, 'sessions') ? (
                <div className={cn('my-1 h-px bg-border/60', expandedView ? 'w-full' : 'w-6')} />
              ) : null}
            </Fragment>
          ))}
        </nav>

        <div className={cn('mt-auto flex flex-col gap-1', expandedView ? 'items-stretch' : 'items-center')}>
          <ApprovalsDrawer expanded={expandedView} />
          <NotificationCenter expanded={expandedView} />
          <ThemeToggle expanded={expandedView} />
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
              <span className="truncate text-sm">Lock</span>
            ) : (
              <Tooltip>Lock</Tooltip>
            )}
          </button>
          {/* Phase 56 E — live-connection indicator + the single recovery-toast owner. */}
          <div className={cn('mt-1 flex', expandedView ? 'px-2.5' : 'justify-center')}>
            <ConnectionStatus variant={expandedView ? 'full' : 'compact'} />
          </div>
          <ConnectionToaster />
        </div>
      </aside>

      <MobileNav pathname={pathname} features={navFeatures} onLock={lock} />

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

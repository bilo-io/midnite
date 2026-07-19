'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Power, Settings } from 'lucide-react';
import { AppFrame, useIdleTimer, type NavLinkComponent } from '@midnite/shell';
import { PasscodeSetupDialog, ThemeToggle } from '@midnite/ui';
import { cn } from '@/lib/utils';
import { getCurrentVersion } from '@/lib/version';
import { docsChangelogUrl } from '@midnite/shared';
import { featuresToNav } from '@/lib/nav-config';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_SETTINGS,
  INACTIVITY_MAX_S,
  INACTIVITY_MIN_S,
  PASSCODE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { PresenceNavPill } from '@/components/office/presence-nav-pill';
import { Screensaver } from '@/components/screensaver';
import { Wordmark } from '@/components/wordmark';
import { ConnectionToaster } from '@/components/connection-status';
import { HeaderActions } from '@/components/header/header-actions';
import { NotificationCenter } from '@/components/notification-center';
import { useNotifications } from '@/components/notifications-provider';

// Route Next's client-side `<Link>` through the shell's injected link seam so the
// router-agnostic `<AppFrame>` still gets SPA navigation.
const NextNavLink: NavLinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
  </Link>
);

/**
 * The wired web app frame (Phase 73 Theme C). Mounts the shared `<AppFrame>` from
 * `@midnite/shell` — feeding it web's `FEATURES`-derived nav config, Next `<Link>`,
 * and the persisted rail state (navMode + collapsed sections) — and owns the
 * web-specific chrome the shell leaves to the host: the brand cluster, the footer
 * cluster (presence · theme · settings · lock · connection), the floating header
 * actions, and the screen-lock / passcode flow. Replaces the old `nav-bar.tsx`.
 */
export function AppShellClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // null = hidden; otherwise the reason it opened (the idle timer or a manual
  // lock), which decides whether the passcode is enforced.
  const [screensaver, setScreensaver] = useState<'idle' | 'locked' | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [settings, setSettings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const [passcode, setPasscode] = useLocalStorage<string | null>(PASSCODE_STORAGE_KEY, null);
  const { unread } = useNotifications();

  const navMode = settings.navMode ?? DEFAULT_SETTINGS.navMode;

  // FEATURES → the shell's injected nav config (pinned home + collapsible sections).
  const { pinned, sections } = featuresToNav(settings.features);

  // Section collapse is persisted in AppSettings; the shell drives it via props.
  const collapsedSections = settings.collapsedNavSections ?? [];
  const toggleSection = (key: string) =>
    setSettings((prev) => {
      const next = new Set(prev.collapsedNavSections ?? []);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, collapsedNavSections: [...next] };
    });

  // Kick the screensaver in after the configured inactivity window; pause the
  // timer while it's already showing or while the passcode setup dialog is open.
  const idleSeconds = Number.isFinite(settings.inactivityTimeoutS)
    ? settings.inactivityTimeoutS
    : DEFAULT_SETTINGS.inactivityTimeoutS;
  const idleTimeoutMs = Math.min(INACTIVITY_MAX_S, Math.max(INACTIVITY_MIN_S, idleSeconds)) * 1000;
  useIdleTimer(idleTimeoutMs, () => setScreensaver((s) => s ?? 'idle'), screensaver === null && !settingUp);

  // The lock button locks straight away — unless a passcode is required but none
  // has been set yet, in which case we set one up first, then lock.
  const lock = () => {
    if (settings.requirePasscode && !passcode) setSettingUp(true);
    else setScreensaver('locked');
  };

  // Allow the command palette's "Lock screen" command to trigger the screensaver.
  useEffect(() => {
    const onLock = () => lock();
    window.addEventListener('midnite:lock-screen', onLock);
    return () => window.removeEventListener('midnite:lock-screen', onLock);
    // lock is stable across renders (no deps change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.requirePasscode, passcode]);

  const brand = ({ expanded }: { expanded: boolean }) => (
    <>
      <Link
        href="/"
        aria-label="midnite"
        className={cn('group relative flex h-9 items-center', expanded ? 'gap-2' : 'w-9 justify-center')}
      >
        <Image
          src="/logo.PNG"
          alt="midnite"
          width={32}
          height={32}
          priority
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border/60 transition-transform group-hover:scale-110"
        />
        {expanded ? <Wordmark /> : <RailTooltip>midnite</RailTooltip>}
      </Link>
      {expanded ? (
        <div className="flex items-center gap-1.5">
          <a
            href={docsChangelogUrl(getCurrentVersion())}
            target="_blank"
            rel="noopener noreferrer"
            title="View changelog"
            className="cursor-pointer rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            v{getCurrentVersion()}
          </a>
          <button
            type="button"
            onClick={() =>
              setSettings((prev) => ({ ...prev, navMode: navMode === 'expanded' ? 'auto' : 'expanded' }))
            }
            aria-label={navMode === 'expanded' ? 'Unlock navigation' : 'Keep navigation expanded'}
            aria-pressed={navMode === 'expanded'}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', navMode !== 'expanded' && 'rotate-180')} />
          </button>
        </div>
      ) : null}
    </>
  );

  const footer = ({ expanded }: { expanded: boolean }) => (
    <>
      {/* "Chat to board" moved into the assistant FAB (Phase 66 D); Approvals +
          Notifications live in the top-right header-actions cluster (Phase 71). */}
      <PresenceNavPill expanded={expanded} />
      <ThemeToggle expanded={expanded} />
      <Link
        href="/settings"
        aria-label="Settings"
        aria-current={pathname === '/settings' || pathname.startsWith('/settings/') ? 'page' : undefined}
        className={cn(
          'group relative flex h-9 items-center rounded-md transition-colors',
          expanded ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
          pathname === '/settings' || pathname.startsWith('/settings/')
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        <Settings className="h-4 w-4 shrink-0" />
        {expanded ? <span className="truncate text-sm">Settings</span> : <RailTooltip>Settings</RailTooltip>}
      </Link>
      <div className={cn('my-1 h-px bg-border/60', expanded ? 'w-full' : 'w-6')} />
      <button
        type="button"
        onClick={lock}
        aria-label="Lock screen"
        className={cn(
          'group relative flex h-9 items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
          expanded ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
        )}
      >
        <Power className="h-4 w-4 shrink-0" />
        {expanded ? <span className="truncate text-sm">Lock</span> : <RailTooltip>Lock</RailTooltip>}
      </button>
      {/* Phase 56 E — the single recovery-toast owner. */}
      <ConnectionToaster />
    </>
  );

  return (
    <>
      <AppFrame
        nav={{ pinned, sections, brand, footer }}
        activePath={pathname}
        linkComponent={NextNavLink}
        navMode={navMode}
        collapsedSections={collapsedSections}
        onToggleSection={toggleSection}
        onLock={lock}
        settings={{ href: '/settings', label: 'Settings', icon: <Settings aria-hidden /> }}
        mobileSheet={<NotificationCenter expanded />}
        mobileUnread={unread}
      >
        {children}
      </AppFrame>

      {/* Top-right header-actions cluster (status · approvals · notifications ·
          avatar), floating across every surface — a sibling of the frame. */}
      <HeaderActions />

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

/** Hover/focus tooltip for the collapsed icon rail (mirrors the old nav-bar tip). */
function RailTooltip({ children }: { children: ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

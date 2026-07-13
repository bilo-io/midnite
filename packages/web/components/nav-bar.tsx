'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Power,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEATURES, groupNavSections, isFeatureEnabled, type NavCategory } from '@/lib/features';
import { Collapse } from '@/components/ui/collapse';
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
import { PresenceNavPill } from '@/components/office/presence-nav-pill';
import { ApprovalsDrawer } from '@/components/approvals-drawer';
import { Screensaver } from '@/components/screensaver';
import { PasscodeSetupDialog } from '@/components/passcode-pad';
import { Wordmark } from '@/components/wordmark';
import { ConnectionStatusFloat, ConnectionToaster } from '@/components/connection-status';
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

  // Enabled surfaces in nav order — the mobile bottom-tab bar renders from the
  // same list the sidebar does (dashboard first when enabled).
  const navFeatures = FEATURES.filter((f) => isFeatureEnabled(settings.features, f.key));
  // The desktop rail splits into the pinned home (`dashboard`) + collapsible
  // category sections (App / Agents / Overview).
  const { pinned, sections } = groupNavSections(navFeatures);

  // Which category sections are collapsed (persisted + synced via AppSettings).
  const collapsedSections = new Set(settings.collapsedNavSections ?? []);
  const toggleSection = (key: NavCategory) =>
    setSettings((prev) => {
      const next = new Set(prev.collapsedNavSections ?? []);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, collapsedNavSections: [...next] };
    });

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
            ? 'w-64 items-stretch bg-background/95 px-2 shadow-xl'
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
          {pinned.map(renderLink)}
          {sections.map((section) => {
            const collapsed = collapsedSections.has(section.key);
            const bodyId = `nav-section-${section.key}`;
            return (
              <div key={section.key} className={cn('flex flex-col', expandedView ? 'items-stretch' : 'items-center')}>
                {expandedView ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    aria-expanded={!collapsed}
                    aria-controls={bodyId}
                    className="mt-2 flex w-full items-center gap-2 rounded-md px-2.5 py-1 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn('h-3 w-3 shrink-0 transition-transform', collapsed && '-rotate-90')}
                    />
                    <span className="shrink-0">{section.label}</span>
                    {/* Rule fills the remaining width to the right of the label. */}
                    <span aria-hidden className="h-px flex-1 bg-border/60" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    aria-expanded={!collapsed}
                    aria-controls={bodyId}
                    aria-label={`${section.label} section`}
                    className="group relative mt-1 flex h-5 w-9 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent/60 hover:text-foreground"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn('h-3.5 w-3.5 transition-transform', collapsed && '-rotate-90')}
                    />
                    <Tooltip>{section.label}</Tooltip>
                  </button>
                )}
                <Collapse open={!collapsed} id={bodyId} role="group" aria-label={section.label}>
                  <div
                    className={cn(
                      'flex flex-col gap-1 pt-1',
                      expandedView ? 'items-stretch' : 'items-center',
                    )}
                  >
                    {section.features.map(renderLink)}
                  </div>
                </Collapse>
              </div>
            );
          })}
        </nav>

        <div className={cn('mt-auto flex flex-col gap-1', expandedView ? 'items-stretch' : 'items-center')}>
          {/* "Chat to board" moved into the assistant FAB (Phase 66 Theme D); the
              palette keeps its own `>` chat mode for keyboard users. */}
          <PresenceNavPill expanded={expandedView} />
          <ApprovalsDrawer expanded={expandedView} />
          <NotificationCenter expanded={expandedView} />
          <ThemeToggle expanded={expandedView} />
          {/* Docs moved into the assistant FAB (Phase 66 Theme C) — it opens the
              current route's docs, so the path-less sidenav Docs link is retired
              (one docs affordance). */}
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
          {/* Phase 56 E — the single recovery-toast owner (the live indicator now
              floats in the top-right corner, see ConnectionStatusFloat below). */}
          <ConnectionToaster />
        </div>
      </aside>

      {/* Live-connection indicator, floating top-right across every surface. */}
      <ConnectionStatusFloat />

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

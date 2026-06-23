'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, Power, Settings, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Feature } from '@/lib/features';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationCenter } from '@/components/notification-center';
import { useNotifications } from '@/components/notifications-provider';

// Phase 24 Theme A2 — the phone-width counterpart to the desktop sidebar
// (`nav-bar.tsx`). Below `md` the sidebar is hidden and this fixed bottom-tab
// bar takes over: the first few enabled surfaces get a one-tap tab, and a
// `More` sheet holds the overflow plus Settings / theme / Lock. `More` is
// always present so those last three stay reachable even when every feature
// tab is full (Decision §5: bottom-tabs + overflow drawer).

/** How many feature surfaces get a dedicated bottom tab before the rest spill into `More`. */
const MAX_TABS = 4;

const SETTINGS: { href: string; label: string; Icon: LucideIcon } = {
  href: '/settings',
  label: 'Settings',
  Icon: Settings,
};

type MobileNavProps = {
  pathname: string;
  /** Enabled surfaces in nav order (dashboard first when enabled). */
  features: Feature[];
  /** Locks the screen — owned by `NavBar` so the lock/passcode flow stays in one place. */
  onLock: () => void;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({ pathname, features, onLock }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const { unread } = useNotifications();

  const tabs = features.slice(0, MAX_TABS);
  const overflow = features.slice(MAX_TABS);

  // Close on navigation; the route change is the implicit confirmation a tap worked.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes the sheet and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        moreRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // The `More` tab reads as active whenever the current route lives behind it.
  const overflowActive =
    open || isActive(pathname, SETTINGS.href) || overflow.some((f) => isActive(pathname, f.href));

  return (
    <>
      {/* Backdrop — sits below the nav bar (z-[39]) so it covers page content
          (composer z-30, headers, etc.) but leaves the tab bar visible. */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-[39] bg-background/70 backdrop-blur-sm md:hidden',
          'transition-opacity duration-300 motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Drawer — separate from backdrop so it can sit above the nav bar (z-50)
          while the backdrop stays below it. Slides up/down via translateY. */}
      <div
        id="mobile-nav-more"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        className={cn(
          'fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 max-h-[60dvh] overflow-y-auto rounded-t-2xl border-t border-border/60 bg-card p-3 shadow-2xl md:hidden',
          'transition-transform duration-300 ease-out motion-reduce:transition-none',
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none',
        )}
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        {/* Settings always lives here so it stays reachable even when every tab slot is taken. */}
        <div className="grid grid-cols-3 gap-2">
          {overflow.map((f) => (
            <DrawerTile key={f.key} href={f.href} label={f.label} Icon={f.Icon} active={isActive(pathname, f.href)} />
          ))}
          <DrawerTile
            href={SETTINGS.href}
            label={SETTINGS.label}
            Icon={SETTINGS.Icon}
            active={isActive(pathname, SETTINGS.href)}
          />
        </div>
        <div className="my-3 h-px bg-border/60" />
        <NotificationCenter expanded />
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle expanded />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLock();
            }}
            className="flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <Power className="h-4 w-4" />
            Lock
          </button>
        </div>
      </div>

      {/* Nav bar — 4rem tall (up from 3.5rem) with extra bottom padding so icons
          don't crowd the home indicator on iPhone. */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-border/60 bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      >
        {tabs.map((f) => (
          <TabLink key={f.key} href={f.href} label={f.label} Icon={f.Icon} active={isActive(pathname, f.href)} />
        ))}
        <button
          ref={moreRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav-more"
          aria-label="Menu"
          className={cn(tabClass, overflowActive ? 'text-foreground' : 'text-muted-foreground')}
        >
          {overflowActive && !open ? <ActiveIndicator /> : null}
          {open
            ? <X className="h-5 w-5 shrink-0" />
            : <Menu className="h-5 w-5 shrink-0" />
          }
          {unread > 0 ? (
            <span aria-hidden className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-destructive" />
          ) : null}
          <span className="max-w-full truncate">Menu</span>
        </button>
      </nav>
    </>
  );
}

const tabClass =
  'relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.625rem] font-medium leading-none transition-colors min-w-0';

function ActiveIndicator() {
  return <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-foreground" />;
}

function TabLink({ href, label, Icon, active }: { href: string; label: string; Icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(tabClass, active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
    >
      {active ? <ActiveIndicator /> : null}
      <Icon className="h-5 w-5 shrink-0" />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

function DrawerTile({ href, label, Icon, active }: { href: string; label: string; Icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors',
        active
          ? 'border-transparent bg-accent text-accent-foreground'
          : 'border-border/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

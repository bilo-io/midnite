'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu, Power, X } from 'lucide-react';
import { ThemeToggle, cn } from '@midnite/ui';

import { isActivePath, type NavItem, type NavLinkComponent } from '../app-frame';

/**
 * The phone-width counterpart to the desktop rail (`AppFrame`'s `<aside>`). Below
 * `md` the rail is hidden and this fixed bottom-tab bar takes over: the first few
 * flattened nav items get a one-tap tab, and a `More` sheet holds the overflow
 * plus an optional Settings tile, a host slot (e.g. a notification centre), the
 * theme toggle and a Lock button. `More` is always present so those stay reachable
 * even when every tab slot is taken (mirrors `web`'s `mobile-nav.tsx`).
 *
 * Router-agnostic like the frame: the active route arrives as `activePath` and
 * links render through the injected `linkComponent`.
 */

/** How many flattened nav items get a dedicated bottom tab before the rest spill into `More`. */
const DEFAULT_MAX_TABS = 4;

export type AppMobileNavProps = {
  /** Flattened nav items in order (`pinned` then every section's items). */
  items: NavItem[];
  /** The current route path; an item whose `href` matches is marked active. */
  activePath: string;
  /** Injected link renderer (from `AppFrame`). */
  linkComponent: NavLinkComponent;
  /** How many items get a dedicated tab before the rest spill into `More` (default 4). */
  maxTabs?: number;
  /** Settings link rendered as a sheet tile (kept reachable even when tabs are full). */
  settings?: NavItem;
  /** Extra content in the `More` sheet, above the theme/lock row (e.g. a notification centre). */
  sheet?: ReactNode;
  /** Unread badge count on the `More` button (renders a dot when > 0). */
  unread?: number;
  /** Locks the screen — the `More`-sheet Lock button (hidden when omitted). */
  onLock?: () => void;
};

const tabClass =
  'relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.625rem] font-medium leading-none transition-colors min-w-0';

function ActiveIndicator() {
  return <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-foreground" />;
}

export function AppMobileNav({
  items,
  activePath,
  linkComponent: Link,
  maxTabs = DEFAULT_MAX_TABS,
  settings,
  sheet,
  unread = 0,
  onLock,
}: AppMobileNavProps) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  const tabs = items.slice(0, maxTabs);
  const overflow = items.slice(maxTabs);

  // Close on navigation; the route change is the implicit confirmation a tap worked.
  useEffect(() => setOpen(false), [activePath]);

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
    open ||
    (settings ? isActivePath(activePath, settings.href) : false) ||
    overflow.some((item) => isActivePath(activePath, item.href));

  return (
    <>
      {/* Backdrop — sits below the nav bar (z-[39]) so it covers page content but
          leaves the tab bar visible. */}
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
        <div className="grid grid-cols-3 gap-2">
          {overflow.map((item) => (
            <DrawerTile
              key={item.href}
              item={item}
              active={isActivePath(activePath, item.href)}
              Link={Link}
            />
          ))}
          {settings ? (
            <DrawerTile
              item={settings}
              active={isActivePath(activePath, settings.href)}
              Link={Link}
            />
          ) : null}
        </div>
        {sheet ? (
          <>
            <div className="my-3 h-px bg-border/60" />
            {sheet}
          </>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle expanded />
          {onLock ? (
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
          ) : null}
        </div>
      </div>

      {/* Nav bar — 4rem tall with extra bottom padding so icons don't crowd the
          home indicator on iPhone. */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-border/60 bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      >
        {tabs.map((item) => (
          <TabLink
            key={item.href}
            item={item}
            active={isActivePath(activePath, item.href)}
            Link={Link}
          />
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
          {open ? <X className="h-5 w-5 shrink-0" /> : <Menu className="h-5 w-5 shrink-0" />}
          {unread > 0 ? (
            <span
              aria-hidden
              className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-destructive"
            />
          ) : null}
          <span className="max-w-full truncate">Menu</span>
        </button>
      </nav>
    </>
  );
}

function TabLink({
  item,
  active,
  Link,
}: {
  item: NavItem;
  active: boolean;
  Link: NavLinkComponent;
}) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className={cn(tabClass, active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
    >
      {active ? <ActiveIndicator /> : null}
      {item.icon ? <span className="flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span> : null}
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}

function DrawerTile({
  item,
  active,
  Link,
}: {
  item: NavItem;
  active: boolean;
  Link: NavLinkComponent;
}) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors',
        active
          ? 'border-transparent bg-accent text-accent-foreground'
          : 'border-border/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      {item.icon ? <span className="flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span> : null}
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}

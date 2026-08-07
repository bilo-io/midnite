'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu, Power, X } from 'lucide-react';
import { ThemeToggle, cn, type ThemeToggleLabels } from '@midnite/ui';

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

// The bar's height (4rem of controls plus the iPhone home-indicator inset) is
// spelled out as a Tailwind arbitrary value everywhere something has to clear it
// — the bar's own `h-`, the `More` sheet's bottom padding below, and each docked
// composer in `web` — because Tailwind's JIT only emits class literals it can
// read in the source, so a shared constant would generate nothing. Keep them in
// step: the sheet's copy drifting out of step with its own transform is exactly
// what hid the bar (bilo-io/midnite-app#5). `AppFrame`'s `<main>` deliberately
// pads slightly more (4.5rem) to leave a gap above the bar.

/**
 * Stacking order for the three fixed layers, lowest first. The invariant this
 * file exists to hold: **the tab bar is the topmost layer**, so no state of the
 * `More` sheet can ever paint over it — the bug in #5 was an opaque sheet at
 * `z-50` covering a bar at `z-40`. The backdrop stays above page content (docked
 * composers and bars sit at `z-30`) but below the sheet it dims for.
 */
const BACKDROP_Z = 'z-[36]';
const SHEET_Z = 'z-[38]';
const NAV_Z = 'z-40';

/**
 * Injected copy for the mobile nav's own strings (Phase 82 E). Shell stays
 * catalog-free — the host passes t()-derived values; every field falls back to
 * the English default, so omitting the prop is non-breaking.
 */
export type AppMobileNavLabels = {
  /** `aria-label` of the bottom-tab `<nav>` landmark. */
  navLabel?: string;
  /** The `More` trigger's label + the overflow sheet's dialog label. */
  menu?: string;
  /** `aria-label` of the sheet backdrop button. */
  closeMenu?: string;
  /** The `More`-sheet Lock button text. */
  lock?: string;
  /** Injected copy for the sheet's theme toggle (ui defaults when omitted). */
  themeToggle?: ThemeToggleLabels;
};

const DEFAULT_LABELS = {
  navLabel: 'Mobile navigation',
  menu: 'Menu',
  closeMenu: 'Close menu',
  lock: 'Lock',
} satisfies AppMobileNavLabels;

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
  /** Injected copy (host-translated); fields default to the English strings. */
  labels?: AppMobileNavLabels;
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
  labels,
}: AppMobileNavProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
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
      {/* Backdrop — above page content, below the sheet and the tab bar, so it
          dims the page while both stay crisp. */}
      <button
        type="button"
        aria-label={copy.closeMenu}
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 bg-background/70 backdrop-blur-sm md:hidden',
          BACKDROP_Z,
          'transition-opacity duration-300 motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Drawer — anchored to the viewport floor, NOT to the top of the tab bar,
          because `translate-y-full` shifts an element by its own height and
          nothing more: anchored at `bottom: 4rem` the closed sheet came to rest
          with its top edge exactly on the bar and, being opaque, hid it
          completely (bilo-io/midnite-app#5). At `bottom-0` the same transform
          genuinely clears the viewport, and the bar's height is reserved as
          padding instead so the content still stops above it. Rendered *below*
          the bar so no state of this sheet — and no bloom of its shadow — can
          reach it. Slides up/down via translateY. */}
      <div
        id="mobile-nav-more"
        role="dialog"
        aria-modal="true"
        aria-label={copy.menu}
        aria-hidden={!open}
        className={cn(
          'fixed inset-x-0 bottom-0 overflow-y-auto rounded-t-2xl border-t border-border/60 bg-card px-3 pt-3 md:hidden',
          // The bar's height, reserved so the tiles/theme/lock row land above it.
          'pb-[calc(0.75rem+4rem+env(safe-area-inset-bottom))]',
          SHEET_Z,
          // The content budget is unchanged (60dvh) — the reserved bar height is
          // added on top of it rather than eaten out of it.
          'max-h-[calc(60dvh+4rem+env(safe-area-inset-bottom))]',
          // Top-biased shadow: an all-round `shadow-2xl` bloomed downward across
          // the tab bar, which is the odd dark seam in the issue's second shot.
          'shadow-[0_-12px_32px_-16px_rgb(0_0_0/0.35)]',
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
          <ThemeToggle expanded labels={copy.themeToggle} />
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
              {copy.lock}
            </button>
          ) : null}
        </div>
      </div>

      {/* Nav bar — 4rem tall with extra bottom padding so icons don't crowd the
          home indicator on iPhone. */}
      <nav
        aria-label={copy.navLabel}
        className={cn(
          'fixed inset-x-0 bottom-0 flex h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-border/60 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur md:hidden',
          NAV_Z,
          // Opaque enough to read cleanly with the sheet sliding up behind it.
          'bg-background/95 supports-[backdrop-filter]:bg-background/80',
        )}
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
          aria-label={copy.menu}
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
          <span className="max-w-full truncate">{copy.menu}</span>
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

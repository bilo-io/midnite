'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { NavMode } from '@midnite/shared';
import { Collapse, cn } from '@midnite/ui';

import { AppMobileNav } from './nav/mobile-nav';

/**
 * The wired app shell both `web` and `admin` mount (Phase 73). It renders a
 * route-aware desktop rail from an **injected** nav config (never a hardcoded
 * feature list — that's the seam that lets the two apps differ), a phone-width
 * bottom-tab bar, and the padded content region.
 *
 * Router-agnostic by design: the shell can't import `next/navigation` (it must run
 * under any host), so the active route arrives as the `activePath` string prop and
 * links render through an injected `linkComponent` (defaults to a plain `<a>`), so a
 * Next.js host can pass `next/link` for client-side navigation.
 *
 * Outer structure mirrors `web`'s real layout: a `position: fixed` rail + a padded
 * `<main>` (the rail reserves no flex space; `<main>` pads by `--nav-offset`). The
 * backdrop, floating header cluster, command palette etc. are the host's to mount
 * as siblings — the frame is only the fixed rail + mobile nav + padded main.
 */

/** A component that renders a navigable link (e.g. `next/link` or a plain `<a>`). */
export type NavLinkComponent = ComponentType<{
  href: string;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
  'aria-current'?: 'page' | undefined;
}>;

export type NavItem = {
  /** Route this item links to; compared against `activePath` for the active state. */
  href: string;
  label: string;
  /** A pre-rendered icon node (e.g. `<Home className="h-4 w-4" />`), not a component. */
  icon?: ReactNode;
  /** Optional trailing adornment (a count, dot, "new" pill). */
  badge?: ReactNode;
};

export type NavSection = {
  /** Stable key for host-persisted collapse state; falls back to the section index. */
  key?: string;
  /** Group heading rendered above the section's items. */
  title?: string;
  items: NavItem[];
  /** A titled/keyed section is collapsible unless this is `false`. */
  collapsible?: boolean;
};

/** Context handed to a `RailSlot` render-prop: whether the rail is expanded. */
export type RailSlotContext = { expanded: boolean };

/** A rail slot — either static content or a render-prop receiving `{ expanded }`. */
export type RailSlot = ReactNode | ((ctx: RailSlotContext) => ReactNode);

export type NavConfig = {
  /** Items rendered above the sections (e.g. Dashboard), with no section header. */
  pinned?: NavItem[];
  sections: NavSection[];
  /** Rail header slot (logo/wordmark/version/expand-chevron) — receives `{ expanded }`. */
  brand?: RailSlot;
  /** Rail footer cluster slot (presence/theme/settings/lock/connection) — receives `{ expanded }`. */
  footer?: RailSlot;
};

export type AppFrameProps = {
  nav: NavConfig;
  /** The current route path; an item whose `href` matches is marked active. */
  activePath: string;
  /** Injected link renderer (defaults to `<a>`); pass `next/link` from a Next host. */
  linkComponent?: NavLinkComponent;
  /** `auto` collapses at rest + expands on hover/focus; `expanded`/`collapsed` lock it (default `auto`). */
  navMode?: NavMode;
  /** Section keys currently collapsed (host-persisted). */
  collapsedSections?: string[];
  /** Toggle a section's collapse (receives `section.key ?? String(index)`). */
  onToggleSection?: (key: string) => void;
  /** How many flattened items get a mobile tab before the rest spill into `More` (default 4). */
  mobileMaxTabs?: number;
  /** Extra content in the mobile `More` sheet, above the theme/lock row. */
  mobileSheet?: ReactNode;
  /** Unread badge count on the mobile `More` button (dot when > 0). */
  mobileUnread?: number;
  /** Mobile `More`-sheet Lock button handler. */
  onLock?: () => void;
  /** Settings link rendered as a mobile-sheet tile (the rail's Settings lives in `nav.footer`). */
  settings?: NavItem;
  /** Right-aligned header content (status, notifications, avatar) — rendered only when provided. */
  headerActions?: ReactNode;
  /** Full-width strip above the content (e.g. the update banner) — rendered only when provided. */
  banner?: ReactNode;
  /**
   * The desktop title bar (Phase 81) — typically a `<TitleBar>` bound to the
   * host's window-chrome bridge. Rendered as a frame sibling; the fixed rail
   * offsets below it via the `--titlebar-h` var the bar publishes.
   */
  titleBar?: ReactNode;
  /** Accessible label for the desktop rail landmark (default "Primary"). */
  navLabel?: string;
  className?: string;
  children: ReactNode;
};

/** Default link renderer — a plain anchor (full navigation). */
const DefaultLink: NavLinkComponent = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

/** Locked-open width (matches `web`'s `NAV_W_EXPANDED`). */
const NAV_W_EXPANDED = '16rem';
/** Icon-rail width (matches `web`'s `NAV_W_COLLAPSED`). */
const NAV_W_COLLAPSED = '3.5rem';

/** True when `activePath` is `href` or a descendant route of it (`/x` ⊂ `/x/y`). */
export function isActivePath(activePath: string, href: string): boolean {
  if (href === '/') return activePath === '/';
  return activePath === href || activePath.startsWith(`${href}/`);
}

/** Resolve a rail slot — call it with `{ expanded }` when it's a render-prop. */
function resolveSlot(slot: RailSlot | undefined, expanded: boolean): ReactNode {
  return typeof slot === 'function' ? slot({ expanded }) : slot;
}

/** Hover-tooltip shown to the right of a rail control when the rail is collapsed. */
function Tooltip({ children }: { children: ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

export function AppFrame({
  nav,
  activePath,
  linkComponent,
  navMode = 'auto',
  collapsedSections,
  onToggleSection,
  mobileMaxTabs,
  mobileSheet,
  mobileUnread,
  onLock,
  settings,
  headerActions,
  banner,
  titleBar,
  navLabel = 'Primary',
  className,
  children,
}: AppFrameProps) {
  const Link = linkComponent ?? DefaultLink;

  // `auto` collapses at rest and expands on hover/keyboard-focus (overlay, no
  // content reflow); `expanded`/`collapsed` are the locked states.
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
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(
      '--nav-offset',
      navMode === 'expanded' ? NAV_W_EXPANDED : NAV_W_COLLAPSED,
    );
  }, [navMode]);

  const collapsedSet = new Set(collapsedSections ?? []);

  const renderLink = (item: NavItem) => {
    const active = isActivePath(activePath, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex h-9 items-center rounded-md transition-colors',
          expandedView ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        {item.icon ? <span className="flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span> : null}
        {expandedView ? (
          <>
            <span className="truncate text-sm">{item.label}</span>
            {item.badge ? <span className="ml-auto shrink-0">{item.badge}</span> : null}
          </>
        ) : (
          <Tooltip>{item.label}</Tooltip>
        )}
      </Link>
    );
  };

  const mobileItems: NavItem[] = [
    ...(nav.pinned ?? []),
    ...nav.sections.flatMap((section) => section.items),
  ];

  return (
    <>
      {titleBar}
      <aside
        {...autoHandlers}
        aria-label={navLabel}
        className={cn(
          // Hidden on phones (the bottom-tab bar takes over below `md`); the
          // icon-rail/expanded states stay for tablet and desktop. `top` follows
          // the update banner's height plus the desktop title bar's (both 0px
          // when absent) so the fixed rail is pushed down with the rest of the
          // app; `bottom-0` keeps it anchored.
          'fixed bottom-0 left-0 top-[calc(var(--update-banner-h,0px)_+_var(--titlebar-h,0px))] z-40 hidden flex-col border-r border-border/60 py-3 backdrop-blur transition-[width,top] duration-200 md:flex',
          expandedView
            ? 'w-64 items-stretch bg-background/95 px-2 shadow-xl'
            : 'w-14 items-center bg-background/70 supports-[backdrop-filter]:bg-background/50',
        )}
      >
        {nav.brand ? (
          <div
            className={cn(
              'mb-4 flex items-center',
              expandedView ? 'justify-between gap-2 px-1' : 'justify-center',
            )}
          >
            {resolveSlot(nav.brand, expandedView)}
          </div>
        ) : null}

        <nav
          aria-label={navLabel}
          className={cn('flex flex-col gap-1', expandedView ? 'items-stretch' : 'items-center')}
        >
          {(nav.pinned ?? []).map(renderLink)}
          {nav.sections.map((section, si) => {
            const sectionKey = section.key ?? String(si);
            const isCollapsible =
              section.collapsible !== false && (section.key != null || section.title != null);
            const label = section.title ?? sectionKey;

            if (!isCollapsible) {
              return (
                <div
                  key={sectionKey}
                  className={cn('flex flex-col gap-1', expandedView ? 'items-stretch' : 'items-center')}
                >
                  {section.items.map(renderLink)}
                </div>
              );
            }

            const collapsed = collapsedSet.has(sectionKey);
            const bodyId = `nav-section-${sectionKey}`;
            return (
              <div
                key={sectionKey}
                className={cn('flex flex-col', expandedView ? 'items-stretch' : 'items-center')}
              >
                {expandedView ? (
                  <button
                    type="button"
                    onClick={() => onToggleSection?.(sectionKey)}
                    aria-expanded={!collapsed}
                    aria-controls={bodyId}
                    className="mt-2 flex w-full items-center gap-2 rounded-md px-2.5 py-1 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn('h-3 w-3 shrink-0 transition-transform', collapsed && '-rotate-90')}
                    />
                    <span className="shrink-0">{label}</span>
                    {/* Rule fills the remaining width to the right of the label. */}
                    <span aria-hidden className="h-px flex-1 bg-border/60" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleSection?.(sectionKey)}
                    aria-expanded={!collapsed}
                    aria-controls={bodyId}
                    aria-label={`${label} section`}
                    className="group relative mt-1 flex h-5 w-9 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent/60 hover:text-foreground"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn('h-3.5 w-3.5 transition-transform', collapsed && '-rotate-90')}
                    />
                    <Tooltip>{label}</Tooltip>
                  </button>
                )}
                <Collapse open={!collapsed} id={bodyId} role="group" aria-label={label}>
                  <div
                    className={cn(
                      'flex flex-col gap-1 pt-1',
                      expandedView ? 'items-stretch' : 'items-center',
                    )}
                  >
                    {section.items.map(renderLink)}
                  </div>
                </Collapse>
              </div>
            );
          })}
        </nav>

        {nav.footer ? (
          <div className={cn('mt-auto flex flex-col gap-1', expandedView ? 'items-stretch' : 'items-center')}>
            {resolveSlot(nav.footer, expandedView)}
          </div>
        ) : null}
      </aside>

      <AppMobileNav
        items={mobileItems}
        activePath={activePath}
        linkComponent={Link}
        maxTabs={mobileMaxTabs}
        settings={settings}
        sheet={mobileSheet}
        unread={mobileUnread}
        onLock={onLock}
      />

      <main
        className={cn(
          'transition-[padding] duration-200 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 md:[padding-left:var(--nav-offset)]',
          className,
        )}
      >
        {banner || headerActions ? (
          <header className="flex items-center justify-end gap-2 px-4 py-2">
            {banner}
            {headerActions}
          </header>
        ) : null}
        {children}
      </main>
    </>
  );
}

'use client';

import { type ComponentType, type ReactNode } from 'react';
import { cn } from '@midnite/ui';

/**
 * The wired app shell both `web` and `admin` mount (Phase 73 Theme B). It renders
 * a route-aware sidenav from an **injected** nav config (never a hardcoded feature
 * list — that's the seam that lets the two apps differ), a header with caller
 * slots, and the content region.
 *
 * Router-agnostic by design: the shell can't import `next/navigation` (it must run
 * under any host), so the active route arrives as the `activePath` string prop and
 * links render through an injected `linkComponent` (defaults to a plain `<a>`), so a
 * Next.js host can pass `next/link` for client-side navigation.
 */

/** A component that renders a navigable link (e.g. `next/link` or a plain `<a>`). */
export type NavLinkComponent = ComponentType<{
  href: string;
  className?: string;
  children: ReactNode;
  'aria-current'?: 'page' | undefined;
}>;

export type NavItem = {
  /** Route this item links to; compared against `activePath` for the active state. */
  href: string;
  label: string;
  icon?: ReactNode;
  /** Optional trailing adornment (a count, dot, "new" pill). */
  badge?: ReactNode;
};

export type NavSection = {
  /** Optional group heading rendered above the section's items. */
  title?: string;
  items: NavItem[];
};

export type NavConfig = {
  sections: NavSection[];
  /** Rendered at the top of the rail (wordmark / logo). */
  brand?: ReactNode;
  /** Rendered pinned to the bottom of the rail (theme toggle, account). */
  footer?: ReactNode;
};

export type AppFrameProps = {
  nav: NavConfig;
  /** The current route path; an item whose `href` matches is marked active. */
  activePath: string;
  /** Injected link renderer (defaults to `<a>`); pass `next/link` from a Next host. */
  linkComponent?: NavLinkComponent;
  /** Right-aligned header content (status, notifications, avatar). */
  headerActions?: ReactNode;
  /** Full-width strip above the header (e.g. the update banner). */
  banner?: ReactNode;
  /** Accessible label for the sidenav landmark (default "Primary"). */
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

/** True when `activePath` is `href` or a descendant route of it (`/x` ⊂ `/x/y`). */
export function isActivePath(activePath: string, href: string): boolean {
  if (href === '/') return activePath === '/';
  return activePath === href || activePath.startsWith(`${href}/`);
}

export function AppFrame({
  nav,
  activePath,
  linkComponent,
  headerActions,
  banner,
  navLabel = 'Primary',
  className,
  children,
}: AppFrameProps) {
  const Link = linkComponent ?? DefaultLink;
  return (
    <div className={cn('flex min-h-screen w-full', className)}>
      <nav
        aria-label={navLabel}
        className="flex w-64 shrink-0 flex-col gap-2 border-r border-border/60 bg-card/40 p-3"
      >
        {nav.brand ? <div className="mb-2 px-1">{nav.brand}</div> : null}

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {nav.sections.map((section, si) => (
            <div key={section.title ?? si} className="flex flex-col gap-1">
              {section.title ? (
                <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </h2>
              ) : null}
              {section.items.map((item) => {
                const active = isActivePath(activePath, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )}
                  >
                    {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                    <span className="truncate">{item.label}</span>
                    {item.badge ? <span className="ml-auto shrink-0">{item.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {nav.footer ? <div className="mt-2 border-t border-border/60 pt-2">{nav.footer}</div> : null}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {banner ? <div className="shrink-0">{banner}</div> : null}
        <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b border-border/60 px-4">
          {headerActions}
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}

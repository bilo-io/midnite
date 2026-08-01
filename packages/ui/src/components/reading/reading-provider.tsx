'use client';

import { createContext, useContext, type ComponentType, type ReactNode } from 'react';

/**
 * The shape every router's link component shares. `next/link` and react-router's
 * `Link` both accept a destination plus children — the destination prop is named
 * differently (`href` vs `to`), so each app passes a thin adapter rather than the
 * router component raw.
 */
export type ReadingLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type ReadingLinkComponent = ComponentType<ReadingLinkProps>;

/** Fallback when no provider is mounted: a plain anchor, so `ui` needs no router. */
function AnchorLink({ href, className, children }: ReadingLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

const ReadingLinkContext = createContext<ReadingLinkComponent>(AnchorLink);

/**
 * Supplies the host app's link component to the reading primitives, so `Prose`
 * can render in-app markdown links through the real router without `ui` importing
 * one (it stays a framework-agnostic leaf — Phase 80 Decision 4). The site passes
 * a `next/link` adapter; docs passes a react-router one, which matters there
 * because the docs app is a hash router and a raw `<a href="/x">` would navigate
 * to a path the static host can't serve.
 */
export function ReadingLayoutProvider({
  linkComponent,
  children,
}: {
  linkComponent: ReadingLinkComponent;
  children: ReactNode;
}) {
  return <ReadingLinkContext.Provider value={linkComponent}>{children}</ReadingLinkContext.Provider>;
}

/** The host's link component, or a plain `<a>` when no provider is mounted. */
export function useReadingLink(): ReadingLinkComponent {
  return useContext(ReadingLinkContext);
}

import type { ReactNode } from 'react';

/**
 * The operator console's fixed navigation (Phase 73 Theme E). Unlike web's
 * FEATURES-derived, user-toggleable nav, admin's rail is a fixed set of operator
 * surfaces — so it's a plain, static list here. Icons are supplied at render time
 * (the shell's `NavItem.icon` takes a pre-rendered node), so this module stays a
 * pure data list with no JSX.
 */

/** Stable id for a nav route — used as the icon-map key at render time. */
export type AdminNavId =
  | 'overview'
  | 'usage'
  | 'users'
  | 'projects'
  | 'versions'
  | 'audit'
  | 'links';

export type AdminNavEntry = {
  id: AdminNavId;
  href: string;
  label: string;
};

/** The seven operator-console routes, in rail order. */
export const ADMIN_NAV: readonly AdminNavEntry[] = [
  { id: 'overview', href: '/', label: 'Overview' },
  { id: 'usage', href: '/usage', label: 'Usage' },
  { id: 'users', href: '/users', label: 'Users & teams' },
  { id: 'projects', href: '/projects', label: 'Projects' },
  { id: 'versions', href: '/versions', label: 'Versions' },
  { id: 'audit', href: '/audit', label: 'Audit' },
  { id: 'links', href: '/links', label: 'Links' },
];

/** A nav item with its icon resolved (built at render from an id→icon map). */
export type ResolvedNavItem = { href: string; label: string; icon: ReactNode };

'use client';

import { ConnectionStatusPill } from '@/components/connection-status';

import { NotificationsMenu } from './notifications-menu';
import { ThemeMenu } from './theme-menu';
import { UserMenu } from './user-menu';

/**
 * The top-right header-actions cluster, anchored across every surface (Phase 71).
 * Left→right: the live-connection status pill, the theme picker (moved here from
 * the sidenav footer, in the slot approvals used to hold), the notifications bell
 * (now a shared notifications/approvals panel), and the user avatar/menu — the
 * same anchor the standalone connection float used, so the items sit level in the
 * header bar (fixing the status dot's vertical drift) and share one home.
 *
 * `top` follows the update banner's height (`--update-banner-h`) plus the base
 * `0.75rem` inset, so the cluster is pushed down *with* the rest of the app when
 * the banner grows in (and eases back when it collapses) instead of being
 * occluded by it — matching the nav rail's offset. `items-center` centres the
 * row; each item carries its own dropdown, tooltip, and count badge.
 */
export function HeaderActions() {
  return (
    <div className="fixed right-4 top-[calc(var(--update-banner-h,0px)+0.75rem)] z-50 flex h-9 items-center gap-1.5 transition-[top] duration-300 ease-in-out motion-reduce:transition-none">
      <ConnectionStatusPill />
      <ThemeMenu />
      <NotificationsMenu />
      <UserMenu />
    </div>
  );
}

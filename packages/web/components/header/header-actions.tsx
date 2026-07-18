'use client';

import { ConnectionStatusPill } from '@/components/connection-status';

import { ApprovalsMenu } from './approvals-menu';
import { NotificationsMenu } from './notifications-menu';
import { UserMenu } from './user-menu';

/**
 * The top-right header-actions cluster, anchored across every surface (Phase 71).
 * Left→right: the live-connection status pill, the approvals inbox, the
 * notifications bell, and the user avatar/menu — the same anchor the standalone
 * connection float used, so the items sit level in the header bar (fixing the
 * status dot's vertical drift) and share one home as new items are added.
 *
 * `top-3` + `items-center` centres the row on the header's compact bar; each item
 * carries its own dropdown, tooltip, and count badge.
 */
export function HeaderActions() {
  return (
    <div className="fixed right-4 top-3 z-50 flex h-9 items-center gap-1.5">
      <ConnectionStatusPill />
      <ApprovalsMenu />
      <NotificationsMenu />
      <UserMenu />
    </div>
  );
}

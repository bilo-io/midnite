'use client';

import { useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import type { PendingApproval } from '@midnite/shared';

import { PendingRow } from '@/components/approvals-drawer';
import {
  NotificationFeedActions,
  NotificationFeedList,
} from '@/components/notification-center';
import { useNotifications } from '@/components/notifications-provider';
import type { ApprovalsSocket } from '@/hooks/use-approvals-socket';
import { cn } from '@/lib/utils';

type PanelTab = 'notifications' | 'approvals';

/** Navigate to Security settings pre-filled to create a rule for this tool. */
function makeRule(approval: PendingApproval): void {
  window.location.href = `/settings/security?prefill=${encodeURIComponent(
    JSON.stringify({ toolName: approval.toolName, effect: 'allow' }),
  )}`;
}

/** A small count pill trailing a tab label. */
function TabCount({ children, amber }: { children: ReactNode; amber?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none',
        amber
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          : 'bg-primary/15 text-primary',
      )}
    >
      {children}
    </span>
  );
}

/** A header tab toggle — text label with an optional trailing count. */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center whitespace-nowrap rounded-md py-0.5 text-sm transition-colors',
        active
          ? 'font-semibold text-foreground'
          : 'font-medium text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

/**
 * The header bell's shared panel. Shows the notification feed by default, with an
 * "Approvals" tab selectable from the header text. The notifications-only header
 * actions (Mark all read / Clear) render on the notifications tab only; on the
 * approvals tab they're replaced by the live pending-approvals inbox. Approvals
 * data is passed in from the bell, which owns the live `/ws/approvals` connection
 * (so the tab count is live even before the panel is opened).
 */
export function NotificationsPanel({
  onClose,
  className,
  pending,
  decide,
}: {
  onClose: () => void;
  className?: string;
  pending: PendingApproval[];
  decide: ApprovalsSocket['decide'];
}) {
  const { unread } = useNotifications();
  const [tab, setTab] = useState<PanelTab>('notifications');
  const approvalCount = pending.length;

  return (
    <div
      aria-label="Notifications and approvals"
      className={cn(
        'flex max-h-[70vh] flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-2xl',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div role="tablist" aria-label="Notifications and approvals" className="flex items-center gap-3">
          <TabButton active={tab === 'notifications'} onClick={() => setTab('notifications')}>
            Notifications
            {unread > 0 ? <TabCount>{unread > 99 ? '99+' : unread}</TabCount> : null}
          </TabButton>
          <TabButton active={tab === 'approvals'} onClick={() => setTab('approvals')}>
            Approvals
            {approvalCount > 0 ? (
              <TabCount amber>{approvalCount > 99 ? '99+' : approvalCount}</TabCount>
            ) : null}
          </TabButton>
        </div>
        {/* Mark all read / Clear are notifications-only. */}
        {tab === 'notifications' ? <NotificationFeedActions /> : null}
      </div>

      {tab === 'notifications' ? (
        <div role="tabpanel" aria-label="Notifications">
          <NotificationFeedList onClose={onClose} />
        </div>
      ) : (
        <div role="tabpanel" aria-label="Approvals" className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-3">
            {approvalCount === 0 ? (
              <div className="flex h-28 flex-col items-center justify-center gap-2 text-center">
                <RefreshCw className="h-6 w-6 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">No pending approvals</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {pending.map((a) => (
                  <li key={a.id}>
                    <PendingRow approval={a} onDecide={decide} onMakeRule={makeRule} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-border/60 px-3 py-2">
            <a
              href="/settings/security"
              onClick={onClose}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Manage autonomy mode &amp; rules →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

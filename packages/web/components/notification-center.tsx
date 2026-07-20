'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Info,
  Inbox,
  LoaderCircle,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Notification, NotificationSeverity } from '@midnite/shared';
import { cn, relativeTime } from '@/lib/utils';
import { useNotifications } from '@/components/notifications-provider';

/** Per-severity row accent + leading icon. */
const SEVERITY_META: Record<NotificationSeverity, { Icon: LucideIcon; className: string }> = {
  info: { Icon: Info, className: 'text-sky-500' },
  warn: { Icon: TriangleAlert, className: 'text-amber-500' },
  urgent: { Icon: CircleAlert, className: 'text-destructive' },
};

/** A single-glyph fallback when the entry is a plain success. */
const DONE_ICON: LucideIcon = CircleCheck;

/**
 * The notification center: a bell in the nav chrome with an unread-count badge,
 * opening a dropdown of the live feed (newest first). Each row deep-links to its
 * source entity (marking that one read on click); the header offers Mark all read
 * + Clear. Desktop-first — anchored under the bell. Reads everything from the
 * {@link useNotifications} provider mounted in the (main) layout.
 *
 * Lives in the sidebar's bottom group alongside the theme toggle / settings, so
 * it mirrors their two states: `expanded` shows the bell + a "Notifications"
 * label (with the unread count as a trailing pill); collapsed shows the icon with
 * a corner badge + a hover tooltip — the same shape as {@link NavBar}'s links.
 */
export function NotificationCenter({ expanded }: { expanded?: boolean }) {
  const { unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape while open.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const badge = unread > 99 ? '99+' : String(unread);

  return (
    <div ref={rootRef} className="group relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          // Match the sidebar links/toggle: full-width labelled row when expanded,
          // a centred icon button when collapsed (`relative` anchors the badge).
          'relative flex h-9 items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
          expanded ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
          open && 'bg-accent text-accent-foreground',
        )}
      >
        <Bell className="h-4 w-4 shrink-0" />
        {expanded ? <span className="truncate text-sm">Notifications</span> : null}
        {unread > 0 ? (
          // Same pill in both states: a trailing count when expanded, a corner
          // badge on the icon when collapsed.
          <span
            aria-hidden
            className={cn(
              'flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground',
              expanded ? 'ml-auto' : 'absolute -right-0.5 -top-0.5',
            )}
          >
            {badge}
          </span>
        ) : null}
      </button>

      {/* Collapsed-only hover tooltip, mirroring the nav links + theme toggle. */}
      {!open && !expanded ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100"
        >
          Notifications
        </span>
      ) : null}

      {open ? (
        // The bell lives at the bottom of the sidebar, so the panel opens upward.
        // Expanded: it stays within the sidenav's bounds (full nav width), like the
        // approvals trigger. Collapsed (icon rail): it widens into open canvas since
        // the rail itself is too narrow to read in.
        <NotificationFeedPanel
          onClose={() => setOpen(false)}
          className={cn(
            'absolute bottom-full left-0 z-50 mb-2',
            expanded ? 'w-full' : 'w-[min(22rem,calc(100vw-2rem))]',
          )}
        />
      ) : null}
    </div>
  );
}

/**
 * The notification-feed header actions — "Mark all read" + "Clear". Split out so
 * both the standalone {@link NotificationFeedPanel} (sidebar bell) and the
 * header's tabbed panel can render them on the notifications tab only.
 */
export function NotificationFeedActions() {
  const { feed, unread, markAllRead, clear } = useNotifications();
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={markAllRead}
        disabled={unread === 0}
        aria-label="Mark all read"
        className="flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <CheckCheck className="h-3.5 w-3.5" />
        Mark all read
      </button>
      <button
        type="button"
        onClick={clear}
        disabled={feed.length === 0}
        aria-label="Clear notifications"
        className="flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Clear
      </button>
    </div>
  );
}

/**
 * The live notification list body (loading / empty / newest-first rows), each row
 * deep-linking to its source entity and marking itself read on click. Split from
 * {@link NotificationFeedPanel} so the header's tabbed panel can drop it under its
 * own tab header. `onClose` dismisses the containing dropdown after navigating.
 */
export function NotificationFeedList({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { feed, loading, markRead, dismiss } = useNotifications();

  const openEntry = (n: Notification) => {
    markRead([n.id]);
    onClose();
    router.push(n.route);
  };

  return (
    <div className="max-h-[60vh] overflow-auto">
      {loading ? (
          <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-label="Loading" />
            Loading…
          </div>
        ) : feed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-10 text-center text-sm text-muted-foreground">
            <Inbox className="h-6 w-6" aria-hidden />
            You&rsquo;re all caught up.
          </div>
        ) : (
          <ul>
            {feed.map((n) => {
              const meta = SEVERITY_META[n.severity];
              const RowIcon = n.kind === 'task.done' ? DONE_ICON : meta.Icon;
              const unreadRow = n.readAt === null;
              return (
                <li key={n.id} className="group/row relative">
                  <button
                    type="button"
                    onClick={() => openEntry(n)}
                    className={cn(
                      'flex w-full items-start gap-2.5 px-3 py-2.5 pr-9 text-left transition-colors hover:bg-accent/60',
                      unreadRow && 'bg-accent/30',
                    )}
                  >
                    <RowIcon
                      aria-hidden
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        n.kind === 'task.done' ? 'text-emerald-500' : meta.className,
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {n.title}
                        </span>
                        {unreadRow ? (
                          <span
                            aria-label="Unread"
                            className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          />
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {n.body}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {relativeTime(n.createdAt)}
                      </span>
                    </span>
                  </button>
                  {/* Per-row dismiss — sits outside the row button (no nested
                      buttons); revealed on hover/focus of the row. */}
                  <button
                    type="button"
                    onClick={() => dismiss(n.id)}
                    aria-label={`Dismiss notification: ${n.title}`}
                    className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}

/**
 * The standalone notification dropdown — the "Mark all read"/"Clear" header plus
 * the live feed. Used by the sidebar bell ({@link NotificationCenter}, opening
 * upward) and the mobile sheet; the header's bell opens the tabbed
 * `NotificationsPanel` instead. The caller supplies positioning/width via
 * `className` and an `onClose` to dismiss the containing dropdown.
 */
export function NotificationFeedPanel({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) {
  return (
    <div
      role="menu"
      aria-label="Notifications"
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-popover shadow-2xl',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border/60 px-3 py-2">
        <p className="text-sm font-semibold">Notifications</p>
        <NotificationFeedActions />
      </div>
      <NotificationFeedList onClose={onClose} />
    </div>
  );
}

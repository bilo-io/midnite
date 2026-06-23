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
 */
export function NotificationCenter() {
  const router = useRouter();
  const { feed, unread, loading, markRead, markAllRead, clear } = useNotifications();
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

  const openEntry = (n: Notification) => {
    markRead([n.id]);
    setOpen(false);
    router.push(n.route);
  };

  const badge = unread > 99 ? '99+' : String(unread);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'group relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
          open && 'bg-accent text-accent-foreground',
        )}
      >
        <Bell className="h-4 w-4 shrink-0" />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
          >
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        // The bell lives at the bottom-left of the sidebar, so the panel opens
        // upward and to the right — into open canvas — not down-and-left off-screen.
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute bottom-full left-0 z-50 mb-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllRead}
                disabled={unread === 0}
                aria-label="Mark all read"
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={feed.length === 0}
                aria-label="Clear notifications"
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>

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
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openEntry(n)}
                        className={cn(
                          'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/60',
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
                          <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                            {relativeTime(n.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

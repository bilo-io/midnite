'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@midnite/ui';
import type { AdminUserSummary } from '@midnite/shared';
import { getAudit } from '@/lib/api';
import { ErrorState, LoadingRows, EmptyState } from '@/components/query-states';
import { formatDate, formatDateTime, formatInt } from '@/lib/format';
import { auditActionLabel, AUDIT_ENTITY_LABEL } from '@/lib/audit-labels';

/**
 * A per-user drill-down (Phase 73 Theme F): identity, team count, join date, and
 * the user's most-recent audit activity (`GET /audit?userId=`). Rendered as a
 * right-side slide-over portal so it overlays the users table.
 */
export function UserDrawer({ user, onClose }: { user: AdminUserSummary; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activity = useQuery({
    queryKey: ['admin', 'audit', 'user', user.id],
    queryFn: ({ signal }) => getAudit({ userId: user.id, limit: 10 }, signal),
  });

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${user.name || user.email}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="truncate text-lg font-semibold text-foreground">{user.name || '—'}</h2>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Teams</dt>
            <dd className="text-foreground">{formatInt(user.teamCount)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Joined</dt>
            <dd className="text-foreground">{formatDate(user.createdAt)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">User id</dt>
            <dd className="truncate font-mono text-xs text-foreground">{user.id}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
          {activity.isPending ? (
            <LoadingRows count={4} />
          ) : activity.isError ? (
            <ErrorState error={activity.error} />
          ) : activity.data.entries.length === 0 ? (
            <EmptyState>No recorded activity for this user.</EmptyState>
          ) : (
            <ul className="flex flex-col divide-y divide-border/40">
              {activity.data.entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-foreground">
                    <span className="text-muted-foreground">{AUDIT_ENTITY_LABEL[entry.entityType]}</span>{' '}
                    {auditActionLabel(entry.action)}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

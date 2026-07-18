'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Clock,
  RefreshCw,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import { type PendingApproval } from '@midnite/shared';
import { cn, relativeTime } from '@/lib/utils';
import { useApprovalsSocket } from '@/hooks/use-approvals-socket';

// ---- countdown helpers ----

function useCountdown(deadlineAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadlineAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadlineAt]);

  if (!deadlineAt) return null;
  const secs = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - now) / 1000));
  if (secs === 0) return 'expired';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ---- single pending request row ----

export function PendingRow({
  approval,
  onDecide,
  onMakeRule,
}: {
  approval: PendingApproval;
  onDecide: (id: string, sessionId: string, decision: 'allow' | 'deny' | 'allow_session') => void;
  onMakeRule: (approval: PendingApproval) => void;
}) {
  const countdown = useCountdown(approval.deadlineAt);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{approval.toolName}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{approval.cwd}</p>
        </div>
        {countdown && (
          <span
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs tabular-nums',
              countdown === 'expired'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            )}
          >
            <Clock className="h-3 w-3" />
            {countdown}
          </span>
        )}
      </div>

      <p className="mb-3 text-sm text-foreground/80">{approval.summary}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onDecide(approval.id, approval.sessionId, 'allow')}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Allow
        </button>
        <button
          type="button"
          onClick={() => onDecide(approval.id, approval.sessionId, 'deny')}
          className="flex items-center gap-1.5 rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-destructive/90"
        >
          <XCircle className="h-3.5 w-3.5" />
          Deny
        </button>
        <button
          type="button"
          onClick={() => onDecide(approval.id, approval.sessionId, 'allow_session')}
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          Allow session
        </button>
        <button
          type="button"
          onClick={() => onMakeRule(approval)}
          className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Make a rule
        </button>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Requested {relativeTime(approval.requestedAt)}
        {approval.taskId && ` · task ${approval.taskId.slice(0, 8)}`}
      </p>
    </div>
  );
}

// ---- main drawer ----

/**
 * Global approvals inbox: an icon in the nav chrome with a pending-count badge,
 * opening a right-side slide-over sheet. Connects to /ws/approvals for live
 * updates. Replays the pending snapshot on connect so a fresh load is correct.
 */
export function ApprovalsDrawer({ expanded }: { expanded?: boolean }) {
  const [open, setOpen] = useState(false);
  const { pending, decide } = useApprovalsSocket();
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function makeRule(approval: PendingApproval): void {
    // Navigate to Security settings with a pre-fill query — the user finishes rule creation there.
    window.location.href = `/settings/security?prefill=${encodeURIComponent(
      JSON.stringify({ toolName: approval.toolName, effect: 'allow' }),
    )}`;
  }

  const count = pending.length;
  const badge = count > 99 ? '99+' : String(count);

  return (
    <div ref={rootRef} className="group relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={count > 0 ? `Approvals inbox, ${count} pending` : 'Approvals inbox'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex w-full items-center rounded-md transition-colors',
          expanded ? 'gap-2.5 px-3 py-2 text-sm font-medium' : 'justify-center p-2',
          open ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        <span className="relative inline-flex shrink-0">
          <ShieldAlert className={cn('h-4 w-4', count > 0 && 'text-amber-500')} />
          {count > 0 && (
            <span
              className={cn(
                'absolute font-mono font-bold leading-none text-white',
                expanded
                  ? 'sr-only'
                  : '-right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-0.5 text-[9px]',
              )}
            >
              {badge}
            </span>
          )}
        </span>
        {expanded && (
          <>
            <span className="flex-1 text-left">Approvals</span>
            {count > 0 && (
              <span className="flex h-5 items-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
          </>
        )}
      </button>

      {/* tooltip when collapsed */}
      {!expanded && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        >
          Approvals {count > 0 && `(${badge})`}
        </span>
      )}

      {/* slide-over sheet */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Approvals inbox"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold">Approvals inbox</h2>
                {count > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    {badge}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close approvals inbox"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {pending.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
                  <RefreshCw className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No pending approvals</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {pending.map((a) => (
                    <li key={a.id}>
                      <PendingRow
                        approval={a}
                        onDecide={decide}
                        onMakeRule={makeRule}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t px-4 py-3">
              <a
                href="/settings/security"
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Manage autonomy mode & rules →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

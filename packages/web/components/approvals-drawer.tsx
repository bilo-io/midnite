'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Inbox, ShieldAlert, XCircle } from 'lucide-react';
import {
  APPROVALS_WS_PATH,
  ApprovalsWsEventSchema,
  type ApprovalDecision,
  type PendingApproval,
} from '@midnite/shared';
import { cn, relativeTime } from '@/lib/utils';
import { gatewayWsUrl } from '@/lib/api';

function useApprovalsInbox() {
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const resolve = useCallback((requestId: string, sessionId: string, decision: ApprovalDecision) => {
    wsRef.current?.send(
      JSON.stringify({ type: 'inbox.resolve', requestId, sessionId, decision }),
    );
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`${gatewayWsUrl()}${APPROVALS_WS_PATH}`);
    wsRef.current = ws;

    ws.onmessage = (e: MessageEvent) => {
      let raw: unknown;
      try {
        raw = JSON.parse(String(e.data));
      } catch {
        return;
      }
      const result = ApprovalsWsEventSchema.safeParse(raw);
      if (!result.success) return;
      const event = result.data;
      if (event.type === 'approval.requested') {
        setPending((prev) =>
          prev.some((p) => p.id === event.approval.id) ? prev : [...prev, event.approval],
        );
      } else {
        setPending((prev) => prev.filter((p) => p.id !== event.id));
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  return { pending, resolve };
}

function useCountdown(deadlineAt: string | null): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!deadlineAt) return undefined;
    const tick = () => {
      const ms = new Date(deadlineAt).getTime() - Date.now();
      if (ms <= 0) { setLabel('expired'); return; }
      const s = Math.ceil(ms / 1000);
      setLabel(`${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt]);

  return label;
}

function CountdownBadge({ deadlineAt }: { deadlineAt: string | null }) {
  const label = useCountdown(deadlineAt);
  if (!label) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
        label === 'expired'
          ? 'bg-muted text-muted-foreground'
          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      )}
    >
      <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

function ApprovalRow({
  approval,
  onResolve,
}: {
  approval: PendingApproval;
  onResolve: (requestId: string, sessionId: string, decision: ApprovalDecision) => void;
}) {
  const router = useRouter();
  const resolve = (decision: ApprovalDecision) =>
    onResolve(approval.id, approval.sessionId, decision);

  const makeRule = () => {
    router.push('/settings/approvals');
  };

  return (
    <li className="flex flex-col gap-2 border-b border-border/60 px-3 py-3 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="truncate text-sm font-medium text-foreground">
              {approval.toolName}
            </span>
            <CountdownBadge deadlineAt={approval.deadlineAt} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{approval.summary}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
            {approval.cwd} · {relativeTime(approval.requestedAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => resolve('allow')}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/25 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          Allow
        </button>
        <button
          type="button"
          onClick={() => resolve('allow-session')}
          className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-500/25 dark:text-sky-400"
        >
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          Allow session
        </button>
        <button
          type="button"
          onClick={() => resolve('deny')}
          className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
        >
          <XCircle className="h-3 w-3" aria-hidden />
          Deny
        </button>
        <button
          type="button"
          onClick={makeRule}
          className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Make a rule…
        </button>
      </div>
    </li>
  );
}

/**
 * Cross-session approvals inbox in the sidebar chrome. Mirrors the
 * NotificationCenter shape: icon with badge when collapsed, labelled row when
 * expanded, popup anchored above the button.
 */
export function ApprovalsDrawer({ expanded }: { expanded?: boolean }) {
  const { pending, resolve } = useApprovalsInbox();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const count = pending.length;
  const badge = count > 99 ? '99+' : String(count);

  return (
    <div ref={rootRef} className="group relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={count > 0 ? `Approvals, ${count} pending` : 'Approvals'}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'relative flex h-9 items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
          expanded ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
          open && 'bg-accent text-accent-foreground',
        )}
      >
        <ShieldAlert className="h-4 w-4 shrink-0" />
        {expanded ? <span className="truncate text-sm">Approvals</span> : null}
        {count > 0 ? (
          <span
            aria-hidden
            className={cn(
              'flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-none text-white',
              expanded ? 'ml-auto' : 'absolute -right-0.5 -top-0.5',
            )}
          >
            {badge}
          </span>
        ) : null}
      </button>

      {!open && !expanded ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100"
        >
          Approvals
        </span>
      ) : null}

      {open ? (
        <div
          role="menu"
          aria-label="Approvals inbox"
          className="absolute bottom-full left-0 z-50 mb-2 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <p className="text-sm font-semibold">Approvals inbox</p>
            {count > 0 ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                {count} pending
              </span>
            ) : null}
          </div>

          <div className="max-h-[60vh] overflow-auto">
            {count === 0 ? (
              <div className="flex flex-col items-center gap-2 px-3 py-10 text-center text-sm text-muted-foreground">
                <Inbox className="h-6 w-6" aria-hidden />
                No pending approvals.
              </div>
            ) : (
              <ul>
                {pending.map((a) => (
                  <ApprovalRow key={a.id} approval={a} onResolve={resolve} />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

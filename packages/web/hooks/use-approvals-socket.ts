'use client';

import { useEffect, useRef, useState } from 'react';
import { APPROVALS_WS_PATH, ApprovalsWsEventSchema, type PendingApproval } from '@midnite/shared';
import { gatewayWsUrl } from '@/lib/api';

export type ApprovalDecisionKind = 'allow' | 'deny' | 'allow_session';

export type ApprovalsSocket = {
  /** Live pending approvals across every session (filter by `sessionId` at the call site). */
  pending: PendingApproval[];
  /** Requests currently being resolved — for disabling their controls. */
  deciding: Set<string>;
  /** Resolve a pending request over the socket (optimistically removes it). */
  decide: (id: string, sessionId: string, decision: ApprovalDecisionKind) => void;
};

/**
 * The live pending-approvals feed over `/ws/approvals`: a self-healing
 * (exponential-backoff) subscription that replays the pending snapshot on connect,
 * plus a `decide` sender. Extracted from `ApprovalsDrawer` so the global drawer and
 * the per-session cockpit (Phase 51 D) share one implementation.
 */
export function useApprovalsSocket(): ApprovalsSocket {
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [deciding, setDeciding] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function schedule(): void {
      if (closed) return;
      const delay = Math.min(30_000, 500 * 2 ** attempt);
      attempt += 1;
      timer = setTimeout(connect, delay);
    }

    function connect(): void {
      if (closed) return;
      try {
        const ws = new WebSocket(`${gatewayWsUrl()}${APPROVALS_WS_PATH}`);
        wsRef.current = ws;
        ws.onopen = () => {
          attempt = 0;
        };
        ws.onmessage = (ev) => {
          try {
            const parsed = ApprovalsWsEventSchema.safeParse(JSON.parse(String(ev.data)));
            if (!parsed.success) return;
            if (parsed.data.type === 'approval.requested') {
              const a = parsed.data.approval;
              setPending((prev) => (prev.find((x) => x.id === a.id) ? prev : [a, ...prev]));
            } else if (parsed.data.type === 'approval.resolved') {
              const { id } = parsed.data;
              setPending((prev) => prev.filter((x) => x.id !== id));
              setDeciding((prev) => {
                const s = new Set(prev);
                s.delete(id);
                return s;
              });
            }
          } catch {
            // ignore malformed frames
          }
        };
        ws.onclose = () => {
          wsRef.current = null;
          schedule();
        };
        ws.onerror = () => {
          ws.close();
        };
      } catch {
        schedule();
      }
    }

    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  function decide(id: string, sessionId: string, decision: ApprovalDecisionKind): void {
    if (deciding.has(id)) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    setDeciding((prev) => new Set(prev).add(id));
    ws.send(JSON.stringify({ type: 'inbox.resolve', requestId: id, sessionId, decision }));
    // Optimistically remove; the WS approval.resolved event confirms + cleans any race.
    setPending((prev) => prev.filter((x) => x.id !== id));
    setDeciding((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  }

  return { pending, deciding, decide };
}

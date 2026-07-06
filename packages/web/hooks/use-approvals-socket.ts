'use client';

import { useState } from 'react';
import {
  APPROVALS_WS_PATH,
  ApprovalsWsEventSchema,
  type ApprovalsWsEvent,
  type PendingApproval,
} from '@midnite/shared';
import { useReliableSubscription, type ReliableChannel } from './use-reliable-subscription';

export type ApprovalDecisionKind = 'allow' | 'deny' | 'allow_session';

export type ApprovalsSocket = {
  /** Live pending approvals across every session (filter by `sessionId` at the call site). */
  pending: PendingApproval[];
  /** Requests currently being resolved — for disabling their controls. */
  deciding: Set<string>;
  /** Resolve a pending request over the socket (optimistically removes it). */
  decide: (id: string, sessionId: string, decision: ApprovalDecisionKind) => void;
};

// Phase 56 D — approvals over the shared reliable subscription. Unlike the board
// channels it replays a pending *snapshot* on connect (no seq envelope) and talks
// back (`decide`), so it decodes its own event shape and uses the hook's `send`.
// Connects tokenless today (auth:false), matching the prior behaviour.
const APPROVALS_CHANNEL: ReliableChannel<ApprovalsWsEvent> = {
  path: APPROVALS_WS_PATH,
  subscribe: () => null,
  auth: false,
  decode: (raw) => {
    const parsed = ApprovalsWsEventSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { event: parsed.data } : null;
  },
};

/**
 * The live pending-approvals feed over `/ws/approvals`: a self-healing
 * subscription (now via the shared reliable hook — Phase 56 D) that replays the
 * pending snapshot on connect, plus a `decide` sender. Shared by the global
 * drawer and the per-session cockpit.
 */
export function useApprovalsSocket(): ApprovalsSocket {
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [deciding, setDeciding] = useState<Set<string>>(new Set());

  const { send } = useReliableSubscription(APPROVALS_CHANNEL, {
    onEvent: (event) => {
      if (event.type === 'approval.requested') {
        const a = event.approval;
        setPending((prev) => (prev.find((x) => x.id === a.id) ? prev : [a, ...prev]));
      } else if (event.type === 'approval.resolved') {
        const { id } = event;
        setPending((prev) => prev.filter((x) => x.id !== id));
        setDeciding((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
      }
    },
  });

  function decide(id: string, sessionId: string, decision: ApprovalDecisionKind): void {
    if (deciding.has(id)) return;
    setDeciding((prev) => new Set(prev).add(id));
    send({ type: 'inbox.resolve', requestId: id, sessionId, decision });
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

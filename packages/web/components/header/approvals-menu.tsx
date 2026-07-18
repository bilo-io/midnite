'use client';

import { RefreshCw, ShieldAlert } from 'lucide-react';
import type { PendingApproval } from '@midnite/shared';

import { PendingRow } from '@/components/approvals-drawer';
import { useApprovalsSocket } from '@/hooks/use-approvals-socket';

import { HeaderIconButton } from './header-icon-button';
import { useHeaderDropdown } from './use-header-dropdown';

/** Navigate to Security settings pre-filled to create a rule for this tool. */
function makeRule(approval: PendingApproval): void {
  window.location.href = `/settings/security?prefill=${encodeURIComponent(
    JSON.stringify({ toolName: approval.toolName, effect: 'allow' }),
  )}`;
}

/**
 * Header-actions approvals button: an icon-only shield with an amber pending-count
 * badge and a tooltip, opening a floating dropdown of the live pending approvals
 * (reusing {@link PendingRow}). Connects to /ws/approvals for live updates.
 */
export function ApprovalsMenu() {
  const { pending, decide } = useApprovalsSocket();
  const { open, toggle, setOpen, rootRef } = useHeaderDropdown();
  const count = pending.length;

  return (
    <div ref={rootRef} className="group relative">
      <HeaderIconButton
        label="Approvals"
        open={open}
        onClick={toggle}
        count={count}
        badgeClassName="bg-amber-500 text-white"
        ariaHaspopup="menu"
      >
        <ShieldAlert className="h-[1.05rem] w-[1.05rem]" />
      </HeaderIconButton>

      {open ? (
        <div
          role="menu"
          aria-label="Approvals"
          className="absolute right-0 top-full z-50 mt-2 flex max-h-[70vh] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">Approvals inbox</p>
            {count > 0 ? (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {count === 0 ? (
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
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Manage autonomy mode &amp; rules →
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

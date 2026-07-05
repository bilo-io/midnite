'use client';

import { useEffect, useRef } from 'react';
import { useConnectionStore, worstStatus, type ChannelStatus } from '@/lib/connection-store';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';

const META: Record<ChannelStatus, { label: string; dot: string; pulse: boolean }> = {
  live: { label: 'Live', dot: 'bg-[hsl(var(--status-done))]', pulse: false },
  reconnecting: { label: 'Reconnecting…', dot: 'bg-[hsl(var(--status-waiting))]', pulse: true },
  stale: { label: 'Reconnecting — data may be behind', dot: 'bg-[hsl(var(--status-abandoned))]', pulse: true },
};

/**
 * Phase 56 E — the live-connection indicator, driven by the worst-of channel
 * status in the connection store. `full` shows a dot + label (sidebar footer);
 * `compact` is a dot-only pip with an accessible title (cockpit panel headers).
 * Pure/read-only — the recovery toast lives in {@link ConnectionToaster} so this
 * can render anywhere without a ToastProvider.
 */
export function ConnectionStatus({
  variant = 'full',
  className,
}: {
  variant?: 'full' | 'compact';
  className?: string;
}) {
  const status = useConnectionStore((s) => worstStatus(s.statuses));
  const meta = META[status];
  const dot = (
    <span
      aria-hidden
      className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot, meta.pulse && 'animate-pulse')}
    />
  );

  if (variant === 'compact') {
    return (
      <span
        role="status"
        aria-label={`Connection: ${meta.label}`}
        title={meta.label}
        className={cn('inline-flex items-center', className)}
      >
        {dot}
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={`Connection: ${meta.label}`}
      className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}
    >
      {dot}
      <span className="truncate">{meta.label}</span>
    </span>
  );
}

/**
 * Mounted once in the app chrome (inside the ToastProvider): toasts when the app
 * recovers from a drop, so a sudden board refresh isn't mysterious. Renders
 * nothing. (Wording upgrades to "reconnected — resynced" once Theme B's
 * resync-required signal lands.)
 */
export function ConnectionToaster(): null {
  const status = useConnectionStore((s) => worstStatus(s.statuses));
  const toast = useToast();
  const prev = useRef<ChannelStatus>(status);

  useEffect(() => {
    if (prev.current !== 'live' && status === 'live') toast.success('Reconnected');
    prev.current = status;
  }, [status, toast]);

  return null;
}

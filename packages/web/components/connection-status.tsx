'use client';

import { useEffect, useRef, useState } from 'react';
import { useConnectionStore, worstStatus, type ChannelStatus } from '@/lib/connection-store';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';

// `token` is the CSS custom-property name for the status colour; the dot class is
// a literal so Tailwind can see it, while the token drives inline glow/tint/ring
// colours (which Tailwind can't build from an interpolated name).
const META: Record<ChannelStatus, { label: string; dot: string; token: string }> = {
  live: { label: 'Live', dot: 'bg-[hsl(var(--status-done))]', token: '--status-done' },
  reconnecting: {
    label: 'Reconnecting…',
    dot: 'bg-[hsl(var(--status-waiting))]',
    token: '--status-waiting',
  },
  stale: {
    label: 'Reconnecting — data may be behind',
    dot: 'bg-[hsl(var(--status-abandoned))]',
    token: '--status-abandoned',
  },
};

/**
 * The status pip: a solid core wrapped in a pulsing halo ring and a soft coloured
 * glow. The halo pulse is always on (motion-safe) so a healthy "Live" state still
 * reads as a breathing indicator, not a static dot.
 */
function StatusDot({ dot, token }: { dot: string; token: string }) {
  const glow = `hsl(var(${token}))`;
  return (
    <span aria-hidden className="relative flex h-2 w-2 shrink-0 items-center justify-center">
      <span
        className={cn(
          'absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping',
          dot,
        )}
      />
      <span
        className={cn('relative inline-flex h-2 w-2 rounded-full', dot)}
        style={{ boxShadow: `0 0 7px 1.5px ${glow}, 0 0 3px 0 ${glow}` }}
      />
    </span>
  );
}

/**
 * Phase 56 E — the live-connection indicator, driven by the worst-of channel
 * status in the connection store. `full` shows a dot + label styled as a sidebar
 * nav row; `compact` is a dot-only pip with an accessible title (cockpit panel
 * headers). Pure/read-only — the recovery toast lives in {@link ConnectionToaster}
 * so this can render anywhere without a ToastProvider.
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

  if (variant === 'compact') {
    return (
      <span
        role="status"
        aria-label={`Connection: ${meta.label}`}
        title={meta.label}
        className={cn('inline-flex items-center justify-center', className)}
      >
        <StatusDot dot={meta.dot} token={meta.token} />
      </span>
    );
  }

  // Matches a nav row: h-9, gap-3, px-2.5, text-sm; the dot sits in the same 1rem
  // icon slot the nav links use, so it lines up with the icons above.
  return (
    <span
      role="status"
      aria-label={`Connection: ${meta.label}`}
      className={cn('flex h-9 w-full items-center gap-3 px-2.5 text-sm text-muted-foreground', className)}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        <StatusDot dot={meta.dot} token={meta.token} />
      </span>
      <span className="min-w-0 truncate leading-tight">{meta.label}</span>
    </span>
  );
}

/**
 * The live-connection indicator pill: a pip over a semi-transparent tint of the
 * status colour. Collapsed it shows only the dot; on hover (or briefly whenever
 * the status changes) the pill grows to the LEFT to reveal the label — the dot
 * itself never moves (the pill is right-anchored). While reconnecting/stale, a
 * bright border segment orbits the pill's perimeter (see `.status-orbit` in
 * globals.css).
 *
 * This is layout-agnostic (no positioning of its own) — the header-actions
 * cluster positions it as the leftmost item; {@link ConnectionStatusFloat} wraps
 * it in a fixed top-right anchor for standalone use.
 */
export function ConnectionStatusPill({ className }: { className?: string }) {
  const status = useConnectionStore((s) => worstStatus(s.statuses));
  const meta = META[status];
  const tint = `hsl(var(${meta.token}) / 0.1)`;
  const orbiting = status !== 'live';

  // Briefly reveal the label whenever the status changes (not on first mount).
  const [revealed, setRevealed] = useState(false);
  const prev = useRef(status);
  useEffect(() => {
    if (prev.current === status) return;
    prev.current = status;
    setRevealed(true);
    const t = setTimeout(() => setRevealed(false), 2400);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div
      role="status"
      aria-label={`Connection: ${meta.label}`}
      className={cn('group', className)}
    >
      {/* h-7 + symmetric px keeps the collapsed state a perfect circle (28×28):
          the zero-width label mustn't be allowed to stretch the height. */}
      <div
        className={cn(
          'relative flex h-7 items-center rounded-full px-2.5 shadow-sm backdrop-blur-md transition-[background-color] duration-300 ease-in-out',
          orbiting && 'status-orbit',
        )}
        style={{
          backgroundColor: tint,
          ...(orbiting ? { ['--orbit-color' as string]: `hsl(var(${meta.token}))` } : {}),
        }}
      >
        {/* Reveals leftward on hover or on a status change; the dot after it stays
            anchored to the right. */}
        <span
          className={cn(
            'max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium leading-none text-foreground opacity-0 transition-all duration-300 ease-in-out group-hover:mr-2 group-hover:max-w-[16rem] group-hover:pl-1 group-hover:opacity-100',
            revealed && 'mr-2 max-w-[16rem] pl-1 opacity-100',
          )}
        >
          {meta.label}
        </span>
        <StatusDot dot={meta.dot} token={meta.token} />
      </div>
    </div>
  );
}

/**
 * The floating live-connection indicator: {@link ConnectionStatusPill} pinned to
 * the top-right corner. Retained for standalone use; the app chrome now renders
 * the pill inside the header-actions cluster instead.
 */
export function ConnectionStatusFloat({ className }: { className?: string }) {
  return <ConnectionStatusPill className={cn('fixed right-4 top-7 z-50', className)} />;
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

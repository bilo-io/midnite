'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SessionStatus } from '@midnite/shared';
import { getSessions } from '@/lib/api';
import { cn } from '@/lib/utils';

// The same three live states the screensaver surfaces. Each links through to the
// sessions board pre-filtered to its status (the board reads `?status=` from the
// URL), and carries the matching status hue.
const PILLS: Array<{ status: SessionStatus; label: string; hueVar: string }> = [
  { status: 'running', label: 'actioning', hueVar: '--status-wip' },
  { status: 'waiting', label: 'awaiting', hueVar: '--status-waiting' },
  { status: 'completed', label: 'complete', hueVar: '--status-done' },
];

// Per-pill offset (negative, so each starts mid-cycle with no startup flash) that
// staggers the shimmer into a left-to-right cascade across the row.
const SHIMMER_STAGGER_S = 0.4;

type Counts = Record<SessionStatus, number>;

/**
 * The screensaver's status pills, reused as live, clickable shortcuts. Counts
 * refresh on an interval; clicking jumps to the sessions board filtered to that
 * status.
 */
export function StatusPills({ className }: { className?: string }) {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const sessions = await getSessions();
        if (cancelled) return;
        const next: Counts = { running: 0, waiting: 0, completed: 0, idle: 0 };
        for (const s of sessions) next[s.status] += 1;
        setCounts(next);
      } catch {
        if (!cancelled) setCounts({ running: 0, waiting: 0, completed: 0, idle: 0 });
      }
    };
    void load();
    const id = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-2.5', className)}>
      {PILLS.map(({ status, label, hueVar }, i) => {
        const n = counts ? counts[status] : null;
        const hue = `hsl(var(${hueVar}))`;
        return (
          <Link
            key={status}
            href={`/sessions?status=${status}`}
            aria-label={`${n ?? 0} ${label} — view sessions`}
            className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <span
              aria-hidden
              className="pill-shimmer pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(100deg, transparent 38%, hsl(var(${hueVar}) / 0.42) 50%, transparent 62%)`,
                animationDelay: `${-(i * SHIMMER_STAGGER_S)}s`,
              }}
            />
            <span
              aria-hidden
              className="relative h-2 w-2 rounded-full"
              style={{ background: hue, boxShadow: `0 0 8px ${hue}` }}
            />
            <span className="relative tabular-nums text-foreground">{n ?? '–'}</span>
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

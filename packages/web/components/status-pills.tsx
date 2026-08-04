'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { SessionStatus } from '@midnite/shared';
import { getSessions } from '@/lib/api';
import { SESSION_STATUS_HUE } from '@/components/session-card';
import { cn } from '@/lib/utils';

// The same three live states the screensaver surfaces. Each links through to the
// sessions board pre-filtered to its status (the board reads `?status=` from the
// URL); the hue is the canonical per-status colour from SESSION_STATUS_HUE.
// Copy lives in `common.chrome.sessionPill.<key>` (Phase 82 D); the registry keeps
// only the status it links to and the catalog key for its word.
const PILLS: Array<{ status: SessionStatus; key: 'actioning' | 'awaiting' | 'complete' }> = [
  { status: 'running', key: 'actioning' },
  { status: 'waiting', key: 'awaiting' },
  { status: 'completed', key: 'complete' },
];

type Counts = Record<SessionStatus, number>;

/**
 * The screensaver's status pills, reused as live, clickable shortcuts. Counts
 * refresh on an interval; clicking jumps to the sessions board filtered to that
 * status.
 */
export function StatusPills({ className }: { className?: string }) {
  const t = useTranslations('common');
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
      {PILLS.map(({ status, key }, i) => {
        const label = t(`chrome.sessionPill.${key}`);
        const n = counts ? counts[status] : null;
        const triple = SESSION_STATUS_HUE[status];
        const hue = `hsl(${triple})`;
        return (
          <Link
            key={status}
            href={`/sessions?status=${status}`}
            aria-label={t('chrome.sessionPill.aria', { count: n ?? 0, label })}
            className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <span
              aria-hidden
              className="pill-shimmer pointer-events-none absolute inset-0"
              // `--pill-i` drives the per-pill cascade stagger + direction in
              // globals.css (see `.pill-shimmer` / `[data-shimmer-dir]`).
              style={
                {
                  background: `linear-gradient(100deg, transparent 38%, hsl(${triple} / 0.42) 50%, transparent 62%)`,
                  '--pill-i': i,
                } as CSSProperties
              }
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

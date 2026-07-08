'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePresenceSummary } from '@/hooks/use-presence-summary';

/**
 * Phase 64 Theme F — the app-chrome "N in the office" pill. Polls the presence
 * summary (team-scoped) and links to `/office`; hidden entirely when nobody's
 * there, so it's a quiet nudge only when teammates are around. Mirrors the
 * nav-bar's collapsed/expanded button shape.
 */
export function PresenceNavPill({ expanded }: { expanded: boolean }) {
  const { count } = usePresenceSummary();
  if (count <= 0) return null;

  const label = `${count} in the office`;
  return (
    <Link
      href="/office"
      aria-label={label}
      title={expanded ? undefined : label}
      className={cn(
        'group relative flex h-9 items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
        expanded ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
      )}
    >
      <span className="relative shrink-0">
        <Users className="h-4 w-4" />
        {!expanded && (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-green-500 px-0.5 text-[9px] font-semibold text-white">
            {count}
          </span>
        )}
      </span>
      {expanded ? <span className="truncate text-sm">{label}</span> : null}
    </Link>
  );
}

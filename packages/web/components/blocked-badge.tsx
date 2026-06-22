import { Lock } from 'lucide-react';

/**
 * A small "Blocked by N" pill shown on task cards/rows when a task has unmet
 * blockers (Phase 27). Muted/locked styling matching the other card badges;
 * renders nothing when `count` is 0 so callers can pass it unconditionally.
 */
export function BlockedBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`Blocked by ${count} task${count === 1 ? '' : 's'}`}
      className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
    >
      <Lock aria-hidden className="h-3 w-3" />
      Blocked
      <span className="tabular-nums">{count}</span>
    </span>
  );
}

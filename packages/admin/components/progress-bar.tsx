import { cn } from '@/lib/utils';

/**
 * A slim, token-styled completion bar (Phase 73 Theme F). `pct` is clamped to
 * 0–100. Reused by the Projects table + drawer to show task completion; carries
 * an accessible `progressbar` role so the value is exposed to assistive tech.
 */
export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted/60', className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

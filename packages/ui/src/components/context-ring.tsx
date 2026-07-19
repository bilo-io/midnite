'use client';

import { cn } from '../lib/cn';

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${n}`;
}

/**
 * A small circular gauge of a session's context-window usage. Green/amber/red as
 * it fills; hover reveals the percentage and used/max token counts.
 */
export function ContextRing({
  tokens,
  limit,
  className,
}: {
  tokens: number;
  limit: number;
  className?: string;
}) {
  const pct = limit > 0 ? Math.max(0, Math.min(1, tokens / limit)) : 0;
  const percentLabel = Math.round(pct * 100);
  const size = 18;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const hue = pct < 0.5 ? '142 71% 45%' : pct < 0.8 ? '38 92% 50%' : '0 84% 60%';

  return (
    <span
      className={cn('group/ring relative inline-flex shrink-0', className)}
      aria-label={`Context window ${percentLabel}% used`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.25)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`hsl(${hue})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * pct} ${circumference}`}
        />
      </svg>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover/ring:opacity-100"
      >
        Context window · {percentLabel}% · ~{formatTokens(tokens)} / {formatTokens(limit)} tokens
      </span>
    </span>
  );
}

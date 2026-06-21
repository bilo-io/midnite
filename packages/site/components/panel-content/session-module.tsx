'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Agent/session card evocation: a live status dot, the task it's on, a progress
 * bar, and an elapsed timer that ticks. Static under reduced motion.
 */
export function SessionModule() {
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(134);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          {!reduced ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-60" />
          ) : null}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#10b981]" />
        </span>
        <span className="text-xs font-medium text-foreground">agent-2</span>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          {formatElapsed(elapsed)}
        </span>
      </div>

      <div className="rounded-lg border border-border/50 bg-card/60 p-3">
        <p className="text-xs font-medium text-foreground">fix flaky login test</p>
        <p className="mt-1 text-[11px] text-muted-foreground">running · packages/web</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] transition-[width] duration-1000"
            style={{ width: '64%' }}
          />
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
        <span>4 slots</span>
        <span>3 running · 1 idle</span>
      </div>
    </div>
  );
}

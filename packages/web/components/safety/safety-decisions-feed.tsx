'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApprovalLogEntry } from '@midnite/shared';
import { listApprovalLog } from '@/lib/api';
import { useGuardrailsListener } from '@/lib/task-events';
import { cn } from '@/lib/utils';

const DENY = new Set(['deny', 'auto-deny']);

function resolutionClass(resolution: string): string {
  if (DENY.has(resolution)) return 'bg-destructive/15 text-destructive';
  if (resolution === 'auto-allow' || resolution === 'allow' || resolution === 'allow-session') {
    return 'bg-success/15 text-success';
  }
  return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
}

/**
 * Phase 50 E — recent act-path decisions (allow/deny/escalate) from the approval
 * log, newest-first. Refetches on a `guardrails.updated` WS event so a pause /
 * emergency-stop / rule change reflects promptly without a poll.
 */
export function SafetyDecisionsFeed({ limit = 20 }: { limit?: number }) {
  const [entries, setEntries] = useState<ApprovalLogEntry[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(() => {
    listApprovalLog({ limit })
      .then((res) => {
        setEntries(res.entries);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [limit]);

  useEffect(() => load(), [load]);
  // A guardrail change (pause/kill/mode/rule) may add decisions — refresh.
  useGuardrailsListener(useCallback(() => load(), [load]));

  if (state === 'loading') return <p className="text-sm text-muted-foreground">Loading decisions…</p>;
  if (state === 'error') return <p className="text-sm text-muted-foreground">Couldn’t load recent decisions.</p>;
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>;

  return (
    <ul className="divide-y divide-border/60">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-2 py-1.5 text-sm">
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              resolutionClass(e.resolution),
            )}
          >
            {e.resolution}
          </span>
          <span className="truncate font-mono text-xs">{e.toolName}</span>
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{e.decidedBy}</span>
          <time className="shrink-0 text-[11px] text-muted-foreground" dateTime={e.createdAt}>
            {new Date(e.createdAt).toLocaleTimeString()}
          </time>
        </li>
      ))}
    </ul>
  );
}

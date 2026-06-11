'use client';

import { Clock } from 'lucide-react';
import type { CouncilRun, CouncilRunStatus } from '@midnite/shared';
import { cn } from '@/lib/utils';

const STATUS_PILL: Record<CouncilRunStatus, { label: string; className: string }> = {
  running: { label: 'Running', className: 'border-blue-500/40 text-blue-500' },
  synthesizing: { label: 'Synthesizing', className: 'border-blue-500/40 text-blue-500' },
  completed: { label: 'Completed', className: 'border-emerald-500/40 text-emerald-600' },
  failed: { label: 'Failed', className: 'border-destructive/40 text-destructive' },
};

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

type Props = {
  runs: CouncilRun[];
  selectedId: string | null;
  onSelect: (run: CouncilRun) => void;
};

/** The council's thread: past debates, newest first. Selecting one loads it
 *  into the tabs read-only (persisted outputs + verdict). */
export function CouncilRunThread({ runs, selectedId, onSelect }: Props) {
  if (runs.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Thread
      </h2>
      <div className="flex flex-col gap-1.5">
        {runs.map((run) => {
          const pill = STATUS_PILL[run.status];
          return (
            <button
              key={run.id}
              type="button"
              onClick={() => onSelect(run)}
              aria-pressed={selectedId === run.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors',
                selectedId === run.id
                  ? 'border-foreground/20 bg-accent/60'
                  : 'border-border/60 bg-card/40 hover:border-foreground/20 hover:bg-accent/40',
              )}
            >
              <span className="min-w-0 flex-1 truncate text-sm">{run.topic}</span>
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  pill.className,
                )}
              >
                {pill.label}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {relativeTime(run.startedAt)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

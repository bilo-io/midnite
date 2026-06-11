'use client';

import { Clock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { CouncilRun, CouncilRunStatus } from '@midnite/shared';
import { Button } from '@/components/ui/button';
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
  open: boolean;
  onToggle: () => void;
};

/**
 * The council's thread of past debates as a collapsible left sidebar, newest
 * first. Selecting one loads it into the tabs (persisted outputs + verdict).
 * Collapsed, it shrinks to a slim rail holding only the expand control.
 */
export function CouncilRunThread({ runs, selectedId, onSelect, open, onToggle }: Props) {
  if (!open) {
    return (
      <aside className="hidden shrink-0 lg:block">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Expand thread"
          title={`Thread (${runs.length})`}
          onClick={onToggle}
          className="h-9 w-9 text-muted-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="w-full shrink-0 lg:w-[240px]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Thread
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Collapse thread"
          onClick={onToggle}
          className="h-7 w-7 text-muted-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>
      {runs.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No debates yet — submit the first topic below.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {runs.map((run) => {
            const pill = STATUS_PILL[run.status];
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelect(run)}
                aria-pressed={selectedId === run.id}
                className={cn(
                  'flex flex-col gap-1 rounded-lg border p-2.5 text-left transition-colors',
                  selectedId === run.id
                    ? 'border-foreground/20 bg-accent/60'
                    : 'border-border/60 bg-card/40 hover:border-foreground/20 hover:bg-accent/40',
                )}
              >
                <span className="line-clamp-2 text-sm leading-snug">{run.topic}</span>
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      pill.className,
                    )}
                  >
                    {pill.label}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {relativeTime(run.startedAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}

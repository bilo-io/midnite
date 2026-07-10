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
  open: boolean;
};

/**
 * The council's thread of past runs as a collapsible left sidebar, newest first.
 * Selecting one loads it into the tabs (persisted outputs + synthesis).
 *
 * The aside is always mounted and animates its width (240px ↔ 0) so the
 * open/close transition is smooth — the same pattern the workflow editor panels
 * use. The toggle itself lives in the content layer (a floating button over the
 * center), not in the rail. The expanded content keeps a fixed width and is
 * clipped by the wrapper's `overflow-hidden`, so it slides rather than reflowing.
 */
export function CouncilRunThread({ runs, selectedId, onSelect, open }: Props) {
  return (
    <aside
      aria-hidden={!open}
      className={cn(
        'relative shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:sticky lg:top-16',
        // On mobile the panel only takes part when open; on lg it always animates
        // between a full-width sidebar and 0.
        open ? 'block w-full' : 'hidden lg:block',
        open ? 'lg:w-[240px]' : 'lg:w-0',
      )}
    >
      {/* Fixed-width content so it doesn't reflow while the wrapper width animates. */}
      <div
        className={cn(
          'w-full transition-opacity duration-200 lg:max-h-[calc(100dvh-4.5rem)] lg:w-[240px] lg:overflow-y-auto lg:pb-2',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Thread
          </h2>
        </div>
        {runs.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No runs yet — submit the first prompt below.
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
                  <span className="line-clamp-2 text-sm leading-snug">{run.prompt}</span>
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
      </div>
    </aside>
  );
}

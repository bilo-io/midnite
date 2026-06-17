'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Routine, RoutineProgress } from '@midnite/shared';
import { getRoutineProgress } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RoutineHistoryModalProps {
  routine: Routine;
  onClose: () => void;
}

export function RoutineHistoryModal({ routine, onClose }: RoutineHistoryModalProps) {
  const [progress, setProgress] = useState<RoutineProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    getRoutineProgress(routine.id).then((p) => {
      setProgress(p);
      setLoading(false);
    });
  }, [routine.id]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Routine history"
          className="pointer-events-auto flex w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">{routine.name} — Last 30 days</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : progress.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <p>No data yet.</p>
                <p className="text-xs">Check off items on the dashboard to start tracking.</p>
              </div>
            ) : (
              <CompletionChart progress={progress} />
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function CompletionChart({ progress }: { progress: RoutineProgress[] }) {
  // Build last-30-day date array
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const progressByDate = new Map<string, number>();
  for (const p of progress) {
    const items = p.snapshot.groups.flatMap((g) => g.items);
    const pct = items.length === 0 ? 0 : items.filter((i) => i.done).length / items.length;
    progressByDate.set(p.date, pct);
  }

  const BAR_W = 16;
  const GAP = 4;
  const H = 160;
  const LABEL_H = 24;
  const TOTAL_W = days.length * (BAR_W + GAP) - GAP;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <svg
          width={TOTAL_W}
          height={H + LABEL_H}
          className="min-w-full"
          aria-label="30-day completion chart"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <line
              key={v}
              x1={0}
              y1={H - v * H}
              x2={TOTAL_W}
              y2={H - v * H}
              stroke="hsl(var(--border))"
              strokeWidth={1}
              strokeDasharray={v === 0 ? undefined : '3 3'}
            />
          ))}

          {/* Bars */}
          {days.map((date, i) => {
            const pct = progressByDate.get(date) ?? null;
            const x = i * (BAR_W + GAP);
            const barH = pct === null ? 2 : Math.max(2, pct * H);
            const y = H - barH;
            const isToday = date === new Date().toISOString().slice(0, 10);

            return (
              <g key={date}>
                <rect
                  x={x}
                  y={pct === null ? H - 2 : y}
                  width={BAR_W}
                  height={barH}
                  rx={3}
                  className={cn(
                    pct === null
                      ? 'fill-muted'
                      : pct >= 1
                        ? 'fill-green-500'
                        : pct >= 0.5
                          ? 'fill-primary'
                          : 'fill-muted-foreground/40',
                  )}
                />
                {/* Today marker */}
                {isToday && (
                  <rect x={x} y={H + 6} width={BAR_W} height={3} rx={1} className="fill-primary" />
                )}
                {/* Month label on 1st of month */}
                {date.endsWith('-01') && (
                  <text
                    x={x + BAR_W / 2}
                    y={H + LABEL_H - 2}
                    textAnchor="middle"
                    fontSize={9}
                    className="fill-muted-foreground"
                  >
                    {new Date(date + 'T12:00:00').toLocaleString('default', { month: 'short' })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" /> 100%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" /> ≥50%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/40" /> &lt;50%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted" /> No data
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-2.5 rounded-sm bg-primary" /> Today
        </span>
      </div>

      {/* Summary stats */}
      <SummaryStats progress={progress} days={days} progressByDate={progressByDate} />
    </div>
  );
}

function SummaryStats({
  days,
  progressByDate,
}: {
  progress: RoutineProgress[];
  days: string[];
  progressByDate: Map<string, number>;
}) {
  const logged = days.filter((d) => progressByDate.has(d)).length;
  const perfects = days.filter((d) => (progressByDate.get(d) ?? 0) >= 1).length;
  const avg =
    logged === 0
      ? 0
      : Math.round(
          (days.reduce((s, d) => s + (progressByDate.get(d) ?? 0), 0) / logged) * 100,
        );

  // Streak: consecutive days from today with data
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i] !== undefined && progressByDate.has(days[i]!)) streak++;
    else break;
  }

  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: 'Days logged', value: logged },
        { label: 'Perfect days', value: perfects },
        { label: 'Avg completion', value: `${avg}%` },
        { label: 'Current streak', value: `${streak}d` },
      ].map((stat) => (
        <div key={stat.label} className="rounded-lg border border-border/60 bg-background/50 px-3 py-2.5 text-center">
          <div className="text-lg font-semibold tabular-nums">{stat.value}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RunOutcome, RunTimelineEntry, RunTimelineResponse } from '@midnite/shared';
import { getRunTimeline } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';

const POLL_MS = 10_000;

/** Outcome → chart colour. Mirrors the Ops outcome palette (ops-cycle-fleet). */
const OUTCOME_COLOR: Record<RunOutcome, string> = {
  done: 'hsl(160 84% 39%)',
  abandoned: 'hsl(45 93% 58%)',
  failed: 'hsl(0 72% 51%)',
  cancelled: 'hsl(215 16% 47%)',
};
/** A live (unfinished) run reads in the primary/blue accent with a pulse. */
const RUNNING_COLOR = 'hsl(217 91% 60%)';

const OUTCOME_LABEL: Record<RunOutcome, string> = {
  done: 'Done',
  abandoned: 'Abandoned',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
} as const;

/** Human-readable duration from milliseconds (e.g. `2.5h`, `3m`, `12s`, `—`). */
function fmtDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  const s = ms / 1_000;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`;
  const m = s / 60;
  if (m < 60) return `${m < 10 ? m.toFixed(1) : Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function fmtClock(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  try {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

/** One attempt, prepared for the horizontal gantt-style bar. */
type Row = {
  label: string;
  offset: number;
  length: number;
  outcome: RunOutcome | null;
  running: boolean;
  durationMs: number | null;
  startedAt: string;
};

function barColor(row: Row): string {
  if (row.running) return RUNNING_COLOR;
  return row.outcome ? OUTCOME_COLOR[row.outcome] : OUTCOME_COLOR.cancelled;
}

/** Prepare the offset/length rows + the shared time domain span. */
function buildRows(runs: RunTimelineEntry[], now: number): { rows: Row[]; span: number } {
  if (runs.length === 0) return { rows: [], span: 0 };
  const starts = runs.map((r) => Date.parse(r.startedAt));
  const ends = runs.map((r, i) => (r.endedAt ? Date.parse(r.endedAt) : now) || starts[i]!);
  const domainStart = Math.min(...starts);
  const domainEnd = Math.max(...ends, now);
  const span = Math.max(1, domainEnd - domainStart);

  const rows = runs.map((r, i) => {
    const startMs = starts[i]!;
    const running = r.endedAt === null;
    const endMs = running ? now : ends[i]!;
    return {
      label: `#${r.retryCount + 1}`,
      offset: startMs - domainStart,
      length: Math.max(0, endMs - startMs),
      outcome: r.outcome,
      running,
      durationMs: running ? Math.max(0, now - startMs) : r.durationMs,
      startedAt: r.startedAt,
    };
  });
  return { rows, span };
}

function RunTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) {
  if (!active || !payload || payload.length === 0) return null;
  // The transparent offset bar is payload[0]; the coloured length bar carries the row.
  const row = payload[payload.length - 1]!.payload;
  const label = row.running ? 'Running' : row.outcome ? OUTCOME_LABEL[row.outcome] : 'Unknown';
  return (
    <div style={TOOLTIP_STYLE}>
      <div className="font-medium text-foreground">
        {row.label} · {label}
      </div>
      <div className="text-muted-foreground">
        {fmtDuration(row.durationMs)} · started {fmtClock(row.startedAt)}
      </div>
    </div>
  );
}

/** Legend swatch for one outcome (or the live "Running" state). */
function Swatch({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn('h-2.5 w-2.5 rounded-sm', pulse && 'animate-pulse')}
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

/**
 * Per-task run timeline (Phase 61 G): a horizontal strip of attempt bars from
 * `agent_run_stats`, each spanning started→ended and coloured by outcome. A live
 * run (null `endedAt`) extends to now in the accent colour with a pulse. Reads
 * `GET /metrics/runs?taskId=` on a poll; honest empty state — no zeroed chart.
 */
export function RunTimeline({ taskId }: { taskId: string }) {
  const { data, error, loading } = usePolling<RunTimelineResponse>(
    () => getRunTimeline(taskId),
    POLL_MS,
    [taskId],
  );

  const now = Date.now();
  const runs = data?.runs ?? [];
  const { rows, span } = useMemo(() => buildRows(runs, now), [runs, now]);

  const anyRunning = runs.some((r) => r.endedAt === null);
  const presentOutcomes = useMemo(
    () => (Object.keys(OUTCOME_LABEL) as RunOutcome[]).filter((o) => runs.some((r) => r.outcome === o)),
    [runs],
  );

  if (error && !data) {
    return <p className="text-sm text-destructive">Couldn’t load agent runs.</p>;
  }
  if (!data && loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!data) return null;
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">No agent runs recorded yet.</p>;
  }

  return (
    <div>
      <div
        role="img"
        aria-label="Run timeline chart"
        className="w-full min-w-0"
        style={{ height: rows.length * 30 + 36 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, span]}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              tickFormatter={(v: number) => fmtDuration(v)}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={40}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
            />
            <Tooltip isAnimationActive={false} content={<RunTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
            {/* Transparent spacer positions each bar at its start offset. */}
            <Bar dataKey="offset" stackId="run" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="length" stackId="run" radius={[2, 2, 2, 2]} isAnimationActive={false}>
              {rows.map((row, i) => (
                <Cell
                  key={i}
                  fill={barColor(row)}
                  className={row.running ? 'animate-pulse' : undefined}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{runs.length}</span> run
          {runs.length === 1 ? '' : 's'}
        </span>
        {presentOutcomes.map((o) => (
          <Swatch key={o} color={OUTCOME_COLOR[o]} label={OUTCOME_LABEL[o]} />
        ))}
        {anyRunning && <Swatch color={RUNNING_COLOR} label="Running" pulse />}
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
import { useLocaleFormat } from '@/lib/use-locale-format';
import { useUnitFormat } from '@/lib/use-unit-format';
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

/** Outcome order for the legend; the words come from `ops.outcomes.*`, shared with the
 *  Ops board's outcome breakdown so one edit moves both. */
const OUTCOMES: readonly RunOutcome[] = ['done', 'abandoned', 'failed', 'cancelled'];

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
} as const;

/** Wall-clock hh:mm in the active locale (was `toLocaleTimeString([])` — the *browser's*
 *  locale, which could disagree with the app's chosen one). */
function useClockLabel(): (iso: string) => string {
  const { dateTime } = useLocaleFormat();
  return (iso) => {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    try {
      return dateTime(ms, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };
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
  const t = useTranslations('ops');
  const { preciseDuration: runDuration } = useUnitFormat();
  const clock = useClockLabel();
  if (!active || !payload || payload.length === 0) return null;
  // The transparent offset bar is payload[0]; the coloured length bar carries the row.
  const row = payload[payload.length - 1]!.payload;
  const label = row.running
    ? t('runTimeline.running')
    : row.outcome
      ? t(`outcomes.${row.outcome}`)
      : t('runTimeline.unknownOutcome');
  return (
    <div style={TOOLTIP_STYLE}>
      <div className="font-medium text-foreground">
        {row.label} · {label}
      </div>
      <div className="text-muted-foreground">
        {t('runTimeline.tooltipMeta', {
          duration: runDuration(row.durationMs),
          time: clock(row.startedAt),
        })}
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
  const t = useTranslations('ops');
  const tCommon = useTranslations('common');
  const { preciseDuration: runDuration } = useUnitFormat();
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
    () => OUTCOMES.filter((o) => runs.some((r) => r.outcome === o)),
    [runs],
  );

  if (error && !data) {
    return <p className="text-sm text-destructive">{t('runTimeline.error')}</p>;
  }
  if (!data && loading) {
    return <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>;
  }
  if (!data) return null;
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('runTimeline.noRuns')}</p>;
  }

  return (
    <div>
      <div
        role="img"
        aria-label={t('runTimeline.chartAria')}
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
              tickFormatter={(v: number) => runDuration(v)}
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
          {t.rich('runTimeline.runCount', {
            count: runs.length,
            strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </span>
        {presentOutcomes.map((o) => (
          <Swatch key={o} color={OUTCOME_COLOR[o]} label={t(`outcomes.${o}`)} />
        ))}
        {anyRunning && <Swatch color={RUNNING_COLOR} label={t('runTimeline.running')} pulse />}
      </div>
    </div>
  );
}

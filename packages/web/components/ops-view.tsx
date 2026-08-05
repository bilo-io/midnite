'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AgentPoolSnapshot, ApprovalLogEntry, ApprovalLogResponse, OpsSummary, UsageSummaryResponse } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { listApprovalLog } from '@/lib/api';
import {
  useApprovalDecidedByLabel,
  useApprovalResolutionLabel,
  useRelativeTimeLabel,
} from '@/lib/i18n-labels';
import { useOpsCardTitle } from '@/lib/ops-widget-labels';
import { useUsdLabel } from '@/lib/use-locale-format';
import { usePolling } from '@/lib/use-polling';
import { WidgetLoader } from './spinner';
import { RunTimeline } from './run-timeline';

// ── Shared primitives ────────────────────────────────────────────────────────

export function SectionCard({
  title,
  action,
  children,
  loading,
  empty,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
}) {
  const t = useTranslations('ops');
  return (
    <div className="flex h-full flex-col rounded-xl border surface-glass p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <WidgetLoader />
          </div>
        ) : empty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('noData')}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/** A compact day-window segmented control, shared by the cost/cycle cards. */
export function WindowToggle<T extends number>({
  windows,
  value,
  onChange,
  label,
}: {
  windows: readonly T[];
  value: T;
  onChange: (v: T) => void;
  /** Group aria-label. Required rather than defaulted: an English default here was a
   *  prop string the i18n gate can't see, so it survived every earlier sweep. */
  label: string;
}) {
  const t = useTranslations('ops');
  return (
    <div className="flex gap-1 rounded-lg border p-1 text-xs" role="group" aria-label={label}>
      {windows.map((w) => (
        <button
          key={w}
          type="button"
          aria-pressed={value === w}
          onClick={() => onChange(w)}
          className={cn(
            'rounded-md px-2.5 py-1 transition-colors',
            value === w
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t('windowDays', { days: w })}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums leading-none">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ── Gauge section (live) ─────────────────────────────────────────────────────

function SlotBar({ used, total }: { used: number; total: number }) {
  const t = useTranslations('ops');
  const pct = total > 0 ? (used / total) * 100 : 0;
  const colour =
    pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full transition-all', colour)}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={used}
        aria-valuemax={total}
        aria-label={t('gauges.slotsUsedAria', { used, total })}
      />
    </div>
  );
}

export function GaugesSection({
  pool,
  summary,
  loading,
}: {
  pool: AgentPoolSnapshot | null;
  summary: OpsSummary | null;
  loading: boolean;
}) {
  const t = useTranslations('ops');
  const cardTitle = useOpsCardTitle();
  const used = pool?.busy ?? 0;
  const total = pool?.capacity ?? 0;
  const queued = pool?.queuedTodo ?? 0;
  const queueDepth = summary?.gauges.queueDepth ?? null;
  const lastTick = summary?.gauges.lastTickLatencyMs ?? null;

  return (
    <SectionCard title={cardTitle('gauges')} loading={loading && !pool && !summary}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">{t('gauges.slotUtilization')}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {used} / {total}
            </span>
          </div>
          <SlotBar used={used} total={total} />
        </div>
        <Stat label={t('gauges.running')} value={used} sub={t('gauges.ofSlots', { total })} />
        <Stat label={t('gauges.queuedTodo')} value={queued} />
        {queueDepth !== null && (
          <Stat label={t('gauges.queueDepth')} value={queueDepth} sub={t('gauges.fromGauges')} />
        )}
        {lastTick !== null && (
          <Stat
            label={t('gauges.lastTick')}
            value={t('gauges.tickMs', { ms: lastTick })}
            sub={t('gauges.schedulerLatency')}
          />
        )}
      </div>
    </SectionCard>
  );
}

// ── Throughput chart ─────────────────────────────────────────────────────────

export function ThroughputSection({ summary, loading }: { summary: OpsSummary | null; loading: boolean }) {
  const t = useTranslations('ops');
  const cardTitle = useOpsCardTitle();
  const days = summary?.throughputByDay ?? [];
  const max = days.reduce((m, d) => Math.max(m, d.count), 0);
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <SectionCard
      title={cardTitle('throughput')}
      loading={loading && !summary}
      empty={!loading && days.length === 0}
    >
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums leading-none">{total}</span>
        <span className="text-xs text-muted-foreground">{t('throughput.runsInWindow')}</span>
      </div>
      <div className="flex h-16 items-end gap-1" aria-label={t('throughput.chartAria')}>
        {days.map((d) => (
          <div
            key={d.day}
            className="flex-1 rounded-sm bg-primary/60"
            style={{ height: `${max > 0 ? Math.max(4, (d.count / max) * 100) : 4}%` }}
            title={t('throughput.barTooltip', { day: d.day, count: d.count })}
          />
        ))}
      </div>
      {days.length > 0 && (
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>{days[0]?.day?.slice(5)}</span>
          <span>{days.at(-1)?.day?.slice(5)}</span>
        </div>
      )}
    </SectionCard>
  );
}

// ── Duration distribution ────────────────────────────────────────────────────

/** Bucket order; the range tokens themselves live in `ops.duration.buckets.*` — they
 *  carry unit letters (`<30s`, `≥2m`) a locale may spell differently. */
const DURATION_BUCKETS: Array<keyof NonNullable<OpsSummary>['durationBuckets']> = [
  'lt1s',
  'lt5s',
  'lt30s',
  'lt2m',
  'gte2m',
];

export function DurationSection({ summary, loading }: { summary: OpsSummary | null; loading: boolean }) {
  const t = useTranslations('ops');
  const cardTitle = useOpsCardTitle();
  const buckets = summary?.durationBuckets;
  const values = buckets
    ? DURATION_BUCKETS.map((key) => ({ key, label: t(`duration.buckets.${key}`), count: buckets[key] }))
    : [];
  const max = values.reduce((m, b) => Math.max(m, b.count), 0);
  const empty = !loading && (!buckets || values.every((b) => b.count === 0));

  return (
    <SectionCard title={cardTitle('duration')} loading={loading && !summary} empty={empty}>
      <div className="flex items-end gap-3">
        {values.map((b) => (
          <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs tabular-nums text-muted-foreground">{b.count}</span>
            <div className="w-full overflow-hidden rounded-sm bg-muted" style={{ height: 48 }}>
              <div
                className="w-full rounded-sm bg-primary/70 transition-all"
                style={{ height: `${max > 0 ? Math.max(4, (b.count / max) * 100) : 0}%` }}
                title={t('duration.barTooltip', { bucket: b.label, count: b.count })}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{b.label}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Outcome counts ────────────────────────────────────────────────────────────

type OutcomeKey = 'done' | 'abandoned' | 'failed' | 'cancelled';

/** Run outcomes are their own vocabulary — a *run* can be cancelled or abandoned, which
 *  the task-status labels don't cover — so the wording lives in `ops.outcomes.*` rather
 *  than reusing `useStatusLabel()`. */
const OUTCOME_META: Array<{ key: OutcomeKey; colour: string }> = [
  { key: 'done', colour: 'bg-emerald-500' },
  { key: 'abandoned', colour: 'bg-amber-500' },
  { key: 'failed', colour: 'bg-destructive' },
  { key: 'cancelled', colour: 'bg-muted-foreground/50' },
];

export function OutcomesSection({ summary, loading }: { summary: OpsSummary | null; loading: boolean }) {
  const t = useTranslations('ops');
  const cardTitle = useOpsCardTitle();
  const counts = summary?.outcomeCounts;
  const total = counts
    ? OUTCOME_META.reduce((s, o) => s + counts[o.key], 0)
    : 0;
  const empty = !loading && (!counts || total === 0);

  return (
    <SectionCard title={cardTitle('outcomes')} loading={loading && !summary} empty={empty}>
      <div className="space-y-2">
        {OUTCOME_META.map(({ key, colour }) => {
          const label = t(`outcomes.${key}`);
          const count = counts?.[key] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', colour)}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={count}
                  aria-valuemax={total}
                  aria-label={t('outcomes.barAria', { outcome: label, count })}
                />
              </div>
              <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ── LLM spend trend ───────────────────────────────────────────────────────────

export function SpendSection({
  usage,
  loading,
}: {
  usage: UsageSummaryResponse | null;
  loading: boolean;
}) {
  const t = useTranslations('ops');
  const cardTitle = useOpsCardTitle();
  const fmtUsd = useUsdLabel();
  const days = usage?.byDay ?? [];
  const max = days.reduce((m, d) => Math.max(m, d.estCostUsd), 0);
  const total = days.reduce((s, d) => s + d.estCostUsd, 0);
  const empty = !loading && days.every((d) => d.estCostUsd === 0);

  return (
    <SectionCard title={cardTitle('spend')} loading={loading && !usage} empty={empty}>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums leading-none">{fmtUsd(total)}</span>
        <span className="text-xs text-muted-foreground">{t('spend.total')}</span>
      </div>
      <div className="flex h-16 items-end gap-1" aria-label={t('spend.chartAria')}>
        {days.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-violet-500/60"
            style={{ height: `${max > 0 ? Math.max(4, (d.estCostUsd / max) * 100) : 4}%` }}
            title={t('spend.barTooltip', { day: d.key, cost: fmtUsd(d.estCostUsd) })}
          />
        ))}
      </div>
      {days.length > 0 && (
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>{days[0]?.key?.slice(5)}</span>
          <span>{days.at(-1)?.key?.slice(5)}</span>
        </div>
      )}
    </SectionCard>
  );
}

// ── Run-timeline drill-down (Phase 61 G) ──────────────────────────────────────

/**
 * Ops drill-down into a single task's run strip: paste/enter a task id and the
 * per-task attempt timeline renders below (the same <RunTimeline> mounted on the
 * task detail page). Lightweight by design — no picker, just a direct id entry.
 */
export function RunTimelineDrilldown() {
  const t = useTranslations('ops');
  const cardTitle = useOpsCardTitle();
  const [input, setInput] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);

  const submit = () => {
    const id = input.trim();
    setTaskId(id.length > 0 ? id : null);
  };

  return (
    <SectionCard title={cardTitle('run-timeline')}>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('runTimeline.placeholder')}
          aria-label={t('runTimeline.taskIdAria')}
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="h-8 shrink-0 rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80 disabled:opacity-40"
        >
          {t('runTimeline.show')}
        </button>
      </form>
      <div className="mt-4">
        {taskId ? (
          <RunTimeline taskId={taskId} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('runTimeline.empty')}</p>
        )}
      </div>
    </SectionCard>
  );
}

// ── Root ops view ─────────────────────────────────────────────────────────────

// ── Decisions section (Phase 23 audit log) ───────────────────────────────────

// The two English `Record<string, string>` maps that used to live here are gone: the
// resolution one keyed on `approved`/`denied`/`error`, none of which are in
// `ApprovalResolutionSchema`, so seven of the eight resolutions fell through its `??` and
// rendered the raw enum value. `useApprovalResolutionLabel()` takes the shared union, so
// a vocabulary change now fails typecheck instead of degrading the column.

function DecisionRow({ entry }: { entry: ApprovalLogEntry }) {
  const resolutionLabel = useApprovalResolutionLabel();
  const decidedByLabel = useApprovalDecidedByLabel();
  const relativeTime = useRelativeTimeLabel();
  const approved = entry.resolution === 'allow' || entry.resolution === 'allow-session' || entry.resolution === 'auto-allow';
  return (
    <tr className="border-b last:border-0">
      <td className="py-2.5 pr-4 align-top">
        <span className="font-mono text-xs text-foreground">{entry.toolName}</span>
        <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">{entry.summary}</p>
      </td>
      <td className="py-2.5 pr-4 align-top">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            approved
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-destructive/10 text-destructive',
          )}
        >
          {resolutionLabel(entry.resolution)}
        </span>
      </td>
      <td className="py-2.5 pr-4 align-top text-xs text-muted-foreground">
        {decidedByLabel(entry.decidedBy)}
      </td>
      <td className="py-2.5 align-top text-xs text-muted-foreground">{relativeTime(entry.createdAt)}</td>
    </tr>
  );
}

const LOG_PAGE = 50;

export function DecisionsSection() {
  const t = useTranslations('ops');
  const cardTitle = useOpsCardTitle();
  const [page, setPage] = useState(1);
  const { data, loading } = usePolling<ApprovalLogResponse>(
    () => listApprovalLog({ limit: LOG_PAGE, page }),
    30_000,
  );

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;

  return (
    <SectionCard title={cardTitle('decisions')} loading={loading} empty={!loading && entries.length === 0}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">{t('decisions.columns.tool')}</th>
              <th className="pb-2 pr-4 font-medium">{t('decisions.columns.resolution')}</th>
              <th className="pb-2 pr-4 font-medium">{t('decisions.columns.decidedBy')}</th>
              <th className="pb-2 font-medium">{t('decisions.columns.when')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <DecisionRow key={e.id} entry={e} />
            ))}
          </tbody>
        </table>
      </div>
      {total > LOG_PAGE && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t('decisions.range', {
              from: (page - 1) * LOG_PAGE + 1,
              to: Math.min(page * LOG_PAGE, total),
              total,
            })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded px-2 py-1 transition-colors hover:bg-accent disabled:opacity-40"
            >
              {t('decisions.prev')}
            </button>
            <button
              type="button"
              disabled={page * LOG_PAGE >= total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded px-2 py-1 transition-colors hover:bg-accent disabled:opacity-40"
            >
              {t('decisions.next')}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// The section components above are composed onto the Ops board by
// `components/ops-grid.tsx` (react-grid-layout), which owns arrangement and the
// add/remove affordances. This module just exports the individual sections.

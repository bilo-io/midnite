'use client';

import { useState } from 'react';
import type { AgentPoolSnapshot, ApprovalLogEntry, ApprovalLogResponse, OpsSummary, UsageSummaryResponse } from '@midnite/shared';
import { cn, relativeTime } from '@/lib/utils';
import { listApprovalLog } from '@/lib/api';
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
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm">
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
          <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>
        ) : (
          children
        )}
      </div>
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
        aria-label={`${used} of ${total} slots used`}
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
  const used = pool?.busy ?? 0;
  const total = pool?.capacity ?? 0;
  const queued = pool?.queuedTodo ?? 0;
  const queueDepth = summary?.gauges.queueDepth ?? null;
  const lastTick = summary?.gauges.lastTickLatencyMs ?? null;

  return (
    <SectionCard title="Live fleet state" loading={loading && !pool && !summary}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Slot utilization</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {used} / {total}
            </span>
          </div>
          <SlotBar used={used} total={total} />
        </div>
        <Stat label="Running" value={used} sub={`of ${total} slots`} />
        <Stat label="Queued todo" value={queued} />
        {queueDepth !== null && <Stat label="Queue depth" value={queueDepth} sub="from gauges" />}
        {lastTick !== null && (
          <Stat label="Last tick" value={`${lastTick}ms`} sub="scheduler latency" />
        )}
      </div>
    </SectionCard>
  );
}

// ── Throughput chart ─────────────────────────────────────────────────────────

export function ThroughputSection({ summary, loading }: { summary: OpsSummary | null; loading: boolean }) {
  const days = summary?.throughputByDay ?? [];
  const max = days.reduce((m, d) => Math.max(m, d.count), 0);
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <SectionCard
      title="Throughput (server-recorded)"
      loading={loading && !summary}
      empty={!loading && days.length === 0}
    >
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums leading-none">{total}</span>
        <span className="text-xs text-muted-foreground">runs in window</span>
      </div>
      <div className="flex h-16 items-end gap-1" aria-label="Throughput bar chart">
        {days.map((d) => (
          <div
            key={d.day}
            className="flex-1 rounded-sm bg-primary/60"
            style={{ height: `${max > 0 ? Math.max(4, (d.count / max) * 100) : 4}%` }}
            title={`${d.day}: ${d.count}`}
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

const DURATION_BUCKETS: Array<{ key: keyof NonNullable<OpsSummary>['durationBuckets']; label: string }> = [
  { key: 'lt1s', label: '<1s' },
  { key: 'lt5s', label: '<5s' },
  { key: 'lt30s', label: '<30s' },
  { key: 'lt2m', label: '<2m' },
  { key: 'gte2m', label: '≥2m' },
];

export function DurationSection({ summary, loading }: { summary: OpsSummary | null; loading: boolean }) {
  const buckets = summary?.durationBuckets;
  const values = buckets ? DURATION_BUCKETS.map((b) => ({ ...b, count: buckets[b.key] })) : [];
  const max = values.reduce((m, b) => Math.max(m, b.count), 0);
  const empty = !loading && (!buckets || values.every((b) => b.count === 0));

  return (
    <SectionCard title="Run duration distribution" loading={loading && !summary} empty={empty}>
      <div className="flex items-end gap-3">
        {values.map((b) => (
          <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs tabular-nums text-muted-foreground">{b.count}</span>
            <div className="w-full overflow-hidden rounded-sm bg-muted" style={{ height: 48 }}>
              <div
                className="w-full rounded-sm bg-primary/70 transition-all"
                style={{ height: `${max > 0 ? Math.max(4, (b.count / max) * 100) : 0}%` }}
                title={`${b.label}: ${b.count}`}
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

const OUTCOME_META: Array<{ key: OutcomeKey; label: string; colour: string }> = [
  { key: 'done', label: 'Done', colour: 'bg-emerald-500' },
  { key: 'abandoned', label: 'Abandoned', colour: 'bg-amber-500' },
  { key: 'failed', label: 'Failed', colour: 'bg-destructive' },
  { key: 'cancelled', label: 'Cancelled', colour: 'bg-muted-foreground/50' },
];

export function OutcomesSection({ summary, loading }: { summary: OpsSummary | null; loading: boolean }) {
  const counts = summary?.outcomeCounts;
  const total = counts
    ? OUTCOME_META.reduce((s, o) => s + counts[o.key], 0)
    : 0;
  const empty = !loading && (!counts || total === 0);

  return (
    <SectionCard title="Run outcomes" loading={loading && !summary} empty={empty}>
      <div className="space-y-2">
        {OUTCOME_META.map(({ key, label, colour }) => {
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
                  aria-label={`${label}: ${count}`}
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
  const days = usage?.byDay ?? [];
  const max = days.reduce((m, d) => Math.max(m, d.estCostUsd), 0);
  const total = days.reduce((s, d) => s + d.estCostUsd, 0);
  const empty = !loading && days.every((d) => d.estCostUsd === 0);

  function fmtUsd(n: number) {
    return n > 0 && n < 0.01 ? '<$0.01' : `$${n.toFixed(2)}`;
  }

  return (
    <SectionCard title="LLM spend (last 30d)" loading={loading && !usage} empty={empty}>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums leading-none">{fmtUsd(total)}</span>
        <span className="text-xs text-muted-foreground">total</span>
      </div>
      <div className="flex h-16 items-end gap-1" aria-label="LLM spend bar chart">
        {days.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-violet-500/60"
            style={{ height: `${max > 0 ? Math.max(4, (d.estCostUsd / max) * 100) : 4}%` }}
            title={`${d.key}: ${fmtUsd(d.estCostUsd)}`}
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
  const [input, setInput] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);

  const submit = () => {
    const id = input.trim();
    setTaskId(id.length > 0 ? id : null);
  };

  return (
    <SectionCard title="Run timeline">
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
          placeholder="Enter a task id to inspect its agent runs"
          aria-label="Task id"
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="h-8 shrink-0 rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80 disabled:opacity-40"
        >
          Show
        </button>
      </form>
      <div className="mt-4">
        {taskId ? (
          <RunTimeline taskId={taskId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter a task id above to see its agent run strip.
          </p>
        )}
      </div>
    </SectionCard>
  );
}

// ── Root ops view ─────────────────────────────────────────────────────────────

// ── Decisions section (Phase 23 audit log) ───────────────────────────────────

const RESOLUTION_LABEL: Record<string, string> = {
  approved: 'Approved',
  denied: 'Denied',
  timeout: 'Timeout',
  error: 'Error',
};

const DECIDED_BY_LABEL: Record<string, string> = {
  user: 'User',
  policy: 'Policy',
  timeout: 'Timeout',
  system: 'System',
};

function DecisionRow({ entry }: { entry: ApprovalLogEntry }) {
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
          {RESOLUTION_LABEL[entry.resolution] ?? entry.resolution}
        </span>
      </td>
      <td className="py-2.5 pr-4 align-top text-xs text-muted-foreground">
        {DECIDED_BY_LABEL[entry.decidedBy] ?? entry.decidedBy}
      </td>
      <td className="py-2.5 align-top text-xs text-muted-foreground">{relativeTime(entry.createdAt)}</td>
    </tr>
  );
}

const LOG_PAGE = 50;

export function DecisionsSection() {
  const [page, setPage] = useState(1);
  const { data, loading } = usePolling<ApprovalLogResponse>(
    () => listApprovalLog({ limit: LOG_PAGE, page }),
    30_000,
  );

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;

  return (
    <SectionCard title="Decisions" loading={loading} empty={!loading && entries.length === 0}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Tool / summary</th>
              <th className="pb-2 pr-4 font-medium">Resolution</th>
              <th className="pb-2 pr-4 font-medium">Decided by</th>
              <th className="pb-2 font-medium">When</th>
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
            {(page - 1) * LOG_PAGE + 1}–{Math.min(page * LOG_PAGE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded px-2 py-1 transition-colors hover:bg-accent disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page * LOG_PAGE >= total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded px-2 py-1 transition-colors hover:bg-accent disabled:opacity-40"
            >
              Next
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

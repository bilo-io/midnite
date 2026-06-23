'use client';

import { RefreshCw } from 'lucide-react';
import type { AgentPoolSnapshot, OpsSummary, UsageSummaryResponse } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';

// ── Shared primitives ────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  loading,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
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
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
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

// ── Root ops view ─────────────────────────────────────────────────────────────

export function OpsView({
  pool,
  summary,
  usage,
  loading,
  onRefresh,
}: {
  pool: AgentPoolSnapshot | null;
  summary: OpsSummary | null;
  usage: UsageSummaryResponse | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="reveal-staged container space-y-6 pb-8 pt-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh ops data"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>
      <GaugesSection pool={pool} summary={summary} loading={loading} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ThroughputSection summary={summary} loading={loading} />
        <OutcomesSection summary={summary} loading={loading} />
      </div>
      <DurationSection summary={summary} loading={loading} />
      <SpendSection usage={usage} loading={loading} />
    </div>
  );
}

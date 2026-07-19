'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Card, LegendDot, Select, type SelectOption } from '@midnite/ui';
import type { UsageAttributionBucket, UsageAttributionGroupBy } from '@midnite/shared';
import { getUsageSummary, getUsageAttribution, getOpsSummary, getCycleTime } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { KpiTile } from '@/components/kpi-tile';
import { BarList } from '@/components/bar-list';
import { DataTable, type Column } from '@/components/data-table';
import { LoadingCards, LoadingRows, ErrorState, EmptyState } from '@/components/query-states';
import { formatUsd, formatInt, formatCompact, formatDuration, isoDaysAgo } from '@/lib/format';
import { buildSpendSeries } from '@/lib/usage-series';

type RangeKey = '7' | '30' | '90';
const RANGE_OPTIONS: SelectOption<RangeKey>[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const DIMENSION_OPTIONS: SelectOption<UsageAttributionGroupBy>[] = [
  { value: 'repo', label: 'By repo' },
  { value: 'project', label: 'By project' },
  { value: 'task', label: 'By task' },
  { value: 'session', label: 'By session' },
];

/**
 * Usage & cost (Phase 73 Theme F). Composes `GET /usage/summary` (LLM spend),
 * `GET /usage/attribution` (agent-session cost by a switchable dimension), and
 * `GET /metrics/ops` + `GET /metrics/cycle-time` (throughput/latency) into one
 * drill-downable view, driven by a time-range + dimension filter.
 */
export default function UsagePage() {
  const [range, setRange] = useState<RangeKey>('30');
  const [dimension, setDimension] = useState<UsageAttributionGroupBy>('repo');
  const from = useMemo(() => isoDaysAgo(Number(range)), [range]);
  const windowDays = Number(range);

  const summary = useQuery({
    queryKey: ['admin', 'usage', 'summary', { from, groupBy: 'day' }],
    queryFn: ({ signal }) => getUsageSummary({ from, groupBy: 'day' }, signal),
  });
  const attribution = useQuery({
    queryKey: ['admin', 'usage', 'attribution', { from, dimension }],
    queryFn: ({ signal }) => getUsageAttribution({ from, groupBy: dimension }, signal),
  });
  const ops = useQuery({
    queryKey: ['admin', 'metrics', 'ops', { from }],
    queryFn: ({ signal }) => getOpsSummary({ from }, signal),
  });
  const cycle = useQuery({
    queryKey: ['admin', 'metrics', 'cycle', { windowDays }],
    queryFn: ({ signal }) => getCycleTime({ windowDays }, signal),
  });

  const series = useMemo(
    () => (summary.data ? buildSpendSeries(summary.data.byDay) : null),
    [summary.data],
  );

  const providerBars = useMemo(
    () =>
      (summary.data?.byProvider ?? []).map((b) => ({
        key: b.key,
        label: b.key,
        value: b.estCostUsd,
        display: formatUsd(b.estCostUsd),
      })),
    [summary.data],
  );

  const attributionColumns: ReadonlyArray<Column<UsageAttributionBucket>> = [
    { key: 'label', header: dimension, render: (r) => r.label ?? r.key },
    { key: 'sessions', header: 'Sessions', className: 'text-right', render: (r) => formatInt(r.sessions) },
    {
      key: 'tokens',
      header: 'Tokens',
      className: 'text-right',
      render: (r) => formatCompact(r.inputTokens + r.outputTokens),
    },
    {
      key: 'cost',
      header: 'Cost',
      className: 'text-right tabular-nums',
      render: (r) => formatUsd(r.estCostUsd),
    },
  ];

  const cycleGroup = cycle.data?.groups[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Usage"
        description="LLM spend, agent-session cost attribution, and fleet throughput."
        actions={
          <>
            <Select options={RANGE_OPTIONS} value={range} onChange={setRange} aria-label="Time range" />
            <Select
              options={DIMENSION_OPTIONS}
              value={dimension}
              onChange={setDimension}
              aria-label="Attribution dimension"
            />
          </>
        }
      />

      {/* Spend KPIs */}
      {summary.isPending ? (
        <LoadingCards count={4} />
      ) : summary.isError ? (
        <ErrorState error={summary.error} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiTile label="Total spend" value={formatUsd(summary.data.totals.estCostUsd)} hint="estimated" />
          <KpiTile label="LLM calls" value={formatInt(summary.data.totals.calls)} />
          <KpiTile
            label="Tokens"
            value={formatCompact(summary.data.totals.inputTokens + summary.data.totals.outputTokens)}
            hint={`${formatCompact(summary.data.totals.inputTokens)} in · ${formatCompact(summary.data.totals.outputTokens)} out`}
          />
          <KpiTile
            label="Session cost"
            value={formatUsd(summary.data.composition.sessionMeasuredUsd)}
            hint="measured agent sessions"
          />
        </div>
      )}

      {/* Spend trend + provider split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Daily spend & volume</h2>
            <div className="flex gap-3 text-xs">
              <LegendDot hueVar="--status-wip" label="Cost" value={100} />
              <LegendDot hueVar="--status-todo" label="Tokens" value={100} />
            </div>
          </div>
          {summary.isPending ? (
            <LoadingRows count={3} />
          ) : summary.isError ? (
            <ErrorState error={summary.error} />
          ) : !series || series.labels.length === 0 ? (
            <EmptyState>No usage recorded in this window.</EmptyState>
          ) : (
            <AreaChart cpu={series.cost} ram={series.tokens} className="h-40 w-full" />
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-sm font-semibold text-foreground">Spend by provider</h2>
          {summary.isPending ? (
            <LoadingRows count={3} />
          ) : summary.isError ? (
            <ErrorState error={summary.error} />
          ) : providerBars.length === 0 ? (
            <EmptyState>No provider spend in this window.</EmptyState>
          ) : (
            <BarList items={providerBars} />
          )}
        </Card>
      </div>

      {/* Cost attribution table */}
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Cost attribution</h2>
          {attribution.data ? (
            <span className="text-xs text-muted-foreground">
              {formatUsd(attribution.data.totals.estCostUsd)} across{' '}
              {formatInt(attribution.data.totals.sessions)} sessions
            </span>
          ) : null}
        </div>
        {attribution.isPending ? (
          <LoadingRows count={5} />
        ) : attribution.isError ? (
          <ErrorState error={attribution.error} />
        ) : attribution.data.buckets.length === 0 ? (
          <EmptyState>No attributed session cost in this window.</EmptyState>
        ) : (
          <DataTable
            columns={attributionColumns}
            rows={attribution.data.buckets}
            rowKey={(r) => r.key}
          />
        )}
      </Card>

      {/* Ops throughput + cycle time */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ops.isPending ? (
          <LoadingCards count={4} />
        ) : ops.isError ? (
          <ErrorState error={ops.error} className="col-span-2 lg:col-span-4" />
        ) : (
          <>
            <KpiTile label="Runs done" value={formatInt(ops.data.outcomeCounts.done)} />
            <KpiTile
              label="Runs failed"
              value={formatInt(ops.data.outcomeCounts.failed)}
              hint={`${formatInt(ops.data.outcomeCounts.abandoned)} abandoned`}
            />
            <KpiTile
              label="Cycle time p50"
              value={formatDuration(cycleGroup?.endToEnd.p50Ms ?? null)}
              hint="create → done"
            />
            <KpiTile
              label="Cycle time p90"
              value={formatDuration(cycleGroup?.endToEnd.p90Ms ?? null)}
              hint="create → done"
            />
          </>
        )}
      </div>
    </div>
  );
}

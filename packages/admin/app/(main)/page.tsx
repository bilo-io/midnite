'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@midnite/ui';
import type { PlatformOverview } from '@midnite/shared';
import { getAdminOverview, getUsageSummary, getAudit } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { KpiTile } from '@/components/kpi-tile';
import { BarList, type BarListItem } from '@/components/bar-list';
import { LoadingCards, LoadingRows, ErrorState, EmptyState } from '@/components/query-states';
import { formatUsd, formatInt, formatDateTime, isoDaysAgo } from '@/lib/format';
import { auditActionLabel, AUDIT_ENTITY_LABEL } from '@/lib/audit-labels';

// Ordered so the board's lifecycle reads left→right in the task breakdown.
const STATUS_ORDER = ['backlog', 'todo', 'wip', 'waiting', 'done', 'abandoned'] as const;
const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  wip: 'In progress',
  waiting: 'Waiting',
  done: 'Done',
  abandoned: 'Abandoned',
};

function taskBars(tasks: PlatformOverview['tasks']): BarListItem[] {
  return STATUS_ORDER.map((status) => {
    const count = tasks[status] ?? 0;
    return { key: status, label: STATUS_LABEL[status] ?? status, value: count, display: formatInt(count) };
  }).filter((b) => b.value > 0);
}

/**
 * Overview — the operator's landing page (Phase 73 Theme F). Platform KPIs from
 * `GET /admin/overview`, a headline 30-day spend from `GET /usage/summary`, a
 * task-status breakdown, and a recent-activity strip from `GET /audit`.
 */
export default function OverviewPage() {
  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: ({ signal }) => getAdminOverview(signal),
  });

  const from = isoDaysAgo(30);
  const usage = useQuery({
    queryKey: ['admin', 'usage', 'summary', { from, groupBy: 'day' }],
    queryFn: ({ signal }) => getUsageSummary({ from, groupBy: 'day' }, signal),
  });

  const activity = useQuery({
    queryKey: ['admin', 'audit', 'recent'],
    queryFn: ({ signal }) => getAudit({ limit: 8 }, signal),
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <PageHeader title="Overview" description="Cross-tenant platform health at a glance." />

      {/* KPI tiles */}
      {overview.isPending ? (
        <LoadingCards count={6} />
      ) : overview.isError ? (
        <ErrorState error={overview.error} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile label="Users" value={formatInt(overview.data.users)} />
          <KpiTile label="Teams" value={formatInt(overview.data.teams)} />
          <KpiTile label="Projects" value={formatInt(overview.data.projects)} />
          <KpiTile
            label="Active sessions"
            value={formatInt(overview.data.activeSessions)}
            hint="running agents"
          />
          <KpiTile
            label="Spend (all-time)"
            value={formatUsd(overview.data.costUsd)}
            hint="estimated"
          />
          <KpiTile
            label="Spend (30d)"
            value={usage.data ? formatUsd(usage.data.totals.estCostUsd) : '—'}
            hint={usage.isError ? 'unavailable' : `${usage.data ? formatInt(usage.data.totals.calls) : 0} calls`}
          />
        </div>
      )}

      {/* Task breakdown + recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-sm font-semibold text-foreground">Tasks by status</h2>
          {overview.isPending ? (
            <LoadingRows count={5} />
          ) : overview.isError ? (
            <ErrorState error={overview.error} />
          ) : taskBars(overview.data.tasks).length === 0 ? (
            <EmptyState>No tasks on the platform yet.</EmptyState>
          ) : (
            <BarList items={taskBars(overview.data.tasks)} />
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
          {activity.isPending ? (
            <LoadingRows count={5} />
          ) : activity.isError ? (
            <ErrorState error={activity.error} />
          ) : activity.data.entries.length === 0 ? (
            <EmptyState>No audit activity recorded.</EmptyState>
          ) : (
            <ul className="flex flex-col divide-y divide-border/40">
              {activity.data.entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-foreground">
                    <span className="text-muted-foreground">{AUDIT_ENTITY_LABEL[entry.entityType]}</span>{' '}
                    {auditActionLabel(entry.action)}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

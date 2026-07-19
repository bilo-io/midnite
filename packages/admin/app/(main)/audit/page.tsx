'use client';

import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Select, type SelectOption } from '@midnite/ui';
import {
  AuditActionSchema,
  AuditEntityTypeSchema,
  type AuditAction,
  type AuditEntityType,
  type AuditEntry,
} from '@midnite/shared';
import { getAudit, type AuditFilters } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { LoadingRows, ErrorState, EmptyState } from '@/components/query-states';
import { formatDateTime } from '@/lib/format';
import { auditActionLabel, AUDIT_ENTITY_LABEL } from '@/lib/audit-labels';

const PAGE_SIZE = 25;
const ANY = '__any__';

const ENTITY_OPTIONS: SelectOption<string>[] = [
  { value: ANY, label: 'All entities' },
  ...AuditEntityTypeSchema.options.map((e) => ({ value: e, label: AUDIT_ENTITY_LABEL[e] })),
];
const ACTION_OPTIONS: SelectOption<string>[] = [
  { value: ANY, label: 'All actions' },
  ...AuditActionSchema.options.map((a) => ({ value: a, label: auditActionLabel(a) })),
];

/** A `YYYY-MM-DD` date-input value → an inclusive ISO bound, or undefined. */
function dayBound(value: string, edge: 'start' | 'end'): string | undefined {
  if (!value) return undefined;
  return `${value}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`;
}

/** The unknown JSON payload rendered as a compact one-liner. */
function payloadSummary(payload: AuditEntry['payload']): string {
  if (!payload) return '—';
  const parts = Object.entries(payload).map(([k, v]) => `${k}: ${String(v)}`);
  const text = parts.join(', ');
  return text.length > 80 ? `${text.slice(0, 79)}…` : text || '—';
}

/**
 * Audit log viewer (Phase 73 Theme F). `GET /audit` with entity / action / user /
 * date-range filters and offset pagination, rendered as a readable table. Filters
 * reset the page to 0; `keepPreviousData` avoids a flash while paging.
 */
export default function AuditPage() {
  const [entityType, setEntityType] = useState<string>(ANY);
  const [action, setAction] = useState<string>(ANY);
  const [userId, setUserId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

  const filters: AuditFilters = useMemo(
    () => ({
      entityType: entityType === ANY ? undefined : (entityType as AuditEntityType),
      action: action === ANY ? undefined : (action as AuditAction),
      userId: userId.trim() || undefined,
      from: dayBound(fromDate, 'start'),
      to: dayBound(toDate, 'end'),
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [entityType, action, userId, fromDate, toDate, page],
  );

  const audit = useQuery({
    queryKey: ['admin', 'audit', 'list', filters],
    queryFn: ({ signal }) => getAudit(filters, signal),
    placeholderData: keepPreviousData,
  });

  const columns: ReadonlyArray<Column<AuditEntry>> = [
    { key: 'when', header: 'When', render: (e) => formatDateTime(e.createdAt) },
    { key: 'action', header: 'Action', render: (e) => auditActionLabel(e.action) },
    {
      key: 'entity',
      header: 'Entity',
      render: (e) => (
        <span className="flex flex-col">
          <span className="text-foreground">{AUDIT_ENTITY_LABEL[e.entityType]}</span>
          <span className="truncate font-mono text-xs text-muted-foreground">{e.entityId}</span>
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Actor',
      render: (e) =>
        e.userId ? (
          <span className="truncate font-mono text-xs text-foreground">{e.userId}</span>
        ) : (
          <span className="text-xs text-muted-foreground">system</span>
        ),
    },
    {
      key: 'payload',
      header: 'Details',
      render: (e) => <span className="text-xs text-muted-foreground">{payloadSummary(e.payload)}</span>,
    },
  ];

  const total = audit.data?.total ?? 0;
  const shown = audit.data?.entries.length ?? 0;
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = page * PAGE_SIZE + shown;
  const hasNext = rangeEnd < total;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader title="Audit" description="Every recorded platform action, filterable and paginated." />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Entity
          <Select
            options={ENTITY_OPTIONS}
            value={entityType}
            onChange={resetPage(setEntityType)}
            aria-label="Filter by entity"
            className="w-40"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Action
          <Select
            options={ACTION_OPTIONS}
            value={action}
            onChange={resetPage(setAction)}
            aria-label="Filter by action"
            className="w-52"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          User id
          <Input
            aria-label="Filter by user id"
            placeholder="usr_…"
            value={userId}
            onChange={(e) => resetPage(setUserId)(e.target.value)}
            className="w-44"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          From
          <Input
            type="date"
            aria-label="From date"
            value={fromDate}
            onChange={(e) => resetPage(setFromDate)(e.target.value)}
            className="w-40"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          To
          <Input
            type="date"
            aria-label="To date"
            value={toDate}
            onChange={(e) => resetPage(setToDate)(e.target.value)}
            className="w-40"
          />
        </label>
      </Card>

      {audit.isPending ? (
        <LoadingRows count={8} />
      ) : audit.isError ? (
        <ErrorState error={audit.error} />
      ) : audit.data.entries.length === 0 ? (
        <EmptyState>No audit entries match these filters.</EmptyState>
      ) : (
        <>
          <DataTable columns={columns} rows={audit.data.entries} rowKey={(e) => e.id} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {rangeStart}–{rangeEnd} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

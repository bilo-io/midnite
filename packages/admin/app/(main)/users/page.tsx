'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Tabs } from '@midnite/ui';
import type { AdminUserSummary } from '@midnite/shared';
import { getAdminUsers, getAdminTeams } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { TeamManager } from '@/components/team-manager';
import { UserDrawer } from '@/components/user-drawer';
import { LoadingRows, ErrorState, EmptyState } from '@/components/query-states';
import { formatDate, formatInt } from '@/lib/format';

type TabKey = 'users' | 'teams';

/**
 * Users & teams (Phase 73 Theme F). Lists every platform user (`GET /admin/users`)
 * with a per-user drill-down, and every team (`GET /admin/teams`) with full CRUD +
 * role management via the shared `/teams…` endpoints (in `TeamManager`).
 */
export default function UsersPage() {
  const [tab, setTab] = useState<TabKey>('users');
  const [selected, setSelected] = useState<AdminUserSummary | null>(null);

  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: ({ signal }) => getAdminUsers(signal),
  });
  const teams = useQuery({
    queryKey: ['admin', 'teams'],
    queryFn: ({ signal }) => getAdminTeams(signal),
  });

  const userLookup = useMemo(() => {
    const map = new Map<string, AdminUserSummary>();
    for (const u of users.data ?? []) map.set(u.id, u);
    return map;
  }, [users.data]);

  const userColumns: ReadonlyArray<Column<AdminUserSummary>> = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <span className="flex flex-col">
          <span className="font-medium text-foreground">{u.name || '—'}</span>
          <span className="text-xs text-muted-foreground">{u.email}</span>
        </span>
      ),
    },
    { key: 'teams', header: 'Teams', className: 'text-right', render: (u) => formatInt(u.teamCount) },
    { key: 'joined', header: 'Joined', render: (u) => formatDate(u.createdAt) },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Users & teams"
        description="Every account and team on the platform — with team management."
        actions={
          <Tabs
            options={[
              { value: 'users', label: `Users${users.data ? ` (${users.data.length})` : ''}` },
              { value: 'teams', label: `Teams${teams.data ? ` (${teams.data.length})` : ''}` },
            ]}
            value={tab}
            onChange={setTab}
            ariaLabel="Users or teams"
          />
        }
      />

      {tab === 'users' ? (
        <Card className="flex flex-col gap-4 p-5">
          {users.isPending ? (
            <LoadingRows count={6} />
          ) : users.isError ? (
            <ErrorState error={users.error} />
          ) : users.data.length === 0 ? (
            <EmptyState>No users on the platform yet.</EmptyState>
          ) : (
            <DataTable
              columns={userColumns}
              rows={users.data}
              rowKey={(u) => u.id}
              onRowClick={setSelected}
            />
          )}
        </Card>
      ) : teams.isPending ? (
        <LoadingRows count={4} />
      ) : teams.isError ? (
        <ErrorState error={teams.error} />
      ) : (
        <TeamManager teams={teams.data} userLookup={userLookup} />
      )}

      {selected ? <UserDrawer user={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

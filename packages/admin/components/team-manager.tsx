'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Select, type SelectOption } from '@midnite/ui';
import type { AdminTeamSummary, AdminUserSummary, TeamRole } from '@midnite/shared';
import {
  createTeam,
  deleteTeam,
  getTeamDetail,
  removeMember,
  setMemberRole,
  updateTeam,
} from '@/lib/api';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ErrorState, LoadingRows } from '@/components/query-states';
import { formatDate, formatInt } from '@/lib/format';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS: SelectOption<TeamRole>[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

/** Slugify a team name into the `[a-z0-9-]+` shape the create endpoint requires. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * The full team-management surface (Phase 73 Theme F): create a team, and per
 * team expand to manage members (change role, remove) plus rename/delete. All
 * writes go through the shared `/teams…` endpoints and invalidate the admin
 * team/user queries on success. `userLookup` maps a member id → identity.
 */
export function TeamManager({
  teams,
  userLookup,
}: {
  teams: readonly AdminTeamSummary[];
  userLookup: Map<string, AdminUserSummary>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <CreateTeamForm />
      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teams yet — create the first one above.</p>
      ) : (
        teams.map((team) => <TeamRow key={team.id} team={team} userLookup={userLookup} />)
      )}
    </div>
  );
}

function useInvalidateTeams(): () => void {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'teams'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  };
}

function CreateTeamForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const invalidate = useInvalidateTeams();

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const mutation = useMutation({
    mutationFn: () => createTeam({ name: name.trim(), slug: effectiveSlug }),
    onSuccess: () => {
      setName('');
      setSlug('');
      setSlugTouched(false);
      invalidate();
    },
  });

  const canSubmit = name.trim().length > 0 && effectiveSlug.length >= 2 && !mutation.isPending;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">Create team</h3>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) mutation.mutate();
        }}
      >
        <Input
          aria-label="Team name"
          placeholder="Team name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="sm:flex-1"
        />
        <Input
          aria-label="Team slug"
          placeholder="team-slug"
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className="sm:w-48"
        />
        <Button type="submit" disabled={!canSubmit}>
          {mutation.isPending ? 'Creating…' : 'Create'}
        </Button>
      </form>
      {mutation.isError ? <ErrorState error={mutation.error} /> : null}
    </Card>
  );
}

function TeamRow({
  team,
  userLookup,
}: {
  team: AdminTeamSummary;
  userLookup: Map<string, AdminUserSummary>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [rename, setRename] = useState(team.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const invalidate = useInvalidateTeams();

  const detail = useQuery({
    queryKey: ['admin', 'teams', team.id, 'detail'],
    queryFn: ({ signal }) => getTeamDetail(team.id, signal),
    enabled: expanded,
  });

  const renameMutation = useMutation({
    mutationFn: () => updateTeam(team.id, { name: rename.trim() }),
    onSuccess: () => {
      setRenaming(false);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTeam(team.id),
    onSuccess: () => {
      setConfirmDelete(false);
      invalidate();
    },
  });

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className={cn('text-muted-foreground transition-transform', expanded && 'rotate-90')}>▸</span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{team.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {team.slug} · {formatInt(team.memberCount)} members · created {formatDate(team.createdAt)}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={() => setRenaming((v) => !v)}>
            Rename
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>

      {renaming ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (rename.trim()) renameMutation.mutate();
          }}
        >
          <Input
            aria-label="New team name"
            value={rename}
            onChange={(e) => setRename(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!rename.trim() || renameMutation.isPending}>
            {renameMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(false)}>
            Cancel
          </Button>
        </form>
      ) : null}
      {renameMutation.isError ? <ErrorState error={renameMutation.error} /> : null}

      {expanded ? (
        <div className="border-t border-border/50 pt-3">
          {detail.isPending ? (
            <LoadingRows count={3} />
          ) : detail.isError ? (
            <ErrorState error={detail.error} />
          ) : detail.data.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {detail.data.members.map((m) => (
                <MemberRow
                  key={m.userId}
                  teamId={team.id}
                  userId={m.userId}
                  role={m.role}
                  identity={userLookup.get(m.userId)}
                  onChanged={invalidate}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${team.name}”?`}
        description="This removes the team and all its memberships. This cannot be undone."
        confirmLabel="Delete team"
        destructive
        busy={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </Card>
  );
}

function MemberRow({
  teamId,
  userId,
  role,
  identity,
  onChanged,
}: {
  teamId: string;
  userId: string;
  role: TeamRole;
  identity: AdminUserSummary | undefined;
  onChanged: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const qc = useQueryClient();
  const invalidateDetail = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'teams', teamId, 'detail'] });
    onChanged();
  };

  const roleMutation = useMutation({
    mutationFn: (next: TeamRole) => setMemberRole(teamId, userId, next),
    onSuccess: invalidateDetail,
  });
  const removeMutation = useMutation({
    mutationFn: () => removeMember(teamId, userId),
    onSuccess: () => {
      setConfirmRemove(false);
      invalidateDetail();
    },
  });

  const label = identity ? identity.name || identity.email : userId;

  return (
    <li className="flex items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block truncate text-sm text-foreground">{label}</span>
        {identity ? <span className="block truncate text-xs text-muted-foreground">{identity.email}</span> : null}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <Select
          options={ROLE_OPTIONS}
          value={role}
          onChange={(next) => roleMutation.mutate(next)}
          disabled={roleMutation.isPending}
          aria-label={`Role for ${label}`}
          className="w-32"
        />
        <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>
          Remove
        </Button>
      </div>
      <ConfirmDialog
        open={confirmRemove}
        title={`Remove ${label}?`}
        description="They lose access to this team's tasks and projects."
        confirmLabel="Remove member"
        destructive
        busy={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate()}
        onCancel={() => setConfirmRemove(false)}
      />
    </li>
  );
}

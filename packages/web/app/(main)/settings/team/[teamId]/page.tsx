'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Copy, Trash2 } from 'lucide-react';
import type { TeamInvite, TeamRole, TeamWithMembers } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createInvite,
  deleteTeam,
  getTeam,
  listInvites,
  removeMember,
  revokeInvite,
  setMemberRole,
  updateTeam,
} from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const ROLES: TeamRole[] = ['owner', 'admin', 'member', 'viewer'];
const ROLE_RANK: Record<TeamRole, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };

function roleBadge(role: TeamRole) {
  const colors: Record<TeamRole, string> = {
    owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    member: 'bg-muted text-muted-foreground',
    viewer: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', colors[role])}>
      {role}
    </span>
  );
}

function MemberRow({
  member,
  currentUserId,
  callerRole,
  onRoleChange,
  onRemove,
}: {
  member: TeamWithMembers['members'][number];
  currentUserId: string;
  callerRole: TeamRole;
  onRoleChange: (userId: string, role: TeamRole) => void;
  onRemove: (userId: string) => void;
}) {
  const canManage =
    ROLE_RANK[callerRole] >= ROLE_RANK['admin'] &&
    member.userId !== currentUserId &&
    ROLE_RANK[callerRole] > ROLE_RANK[member.role];

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {member.userId.slice(0, 2).toUpperCase()}
        </div>
        <span className="truncate text-sm font-mono text-muted-foreground text-xs">{member.userId}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {canManage ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.userId, e.target.value as TeamRole)}
            className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
          >
            {ROLES.filter((r) => r !== 'owner' && ROLE_RANK[r] < ROLE_RANK[callerRole]).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        ) : (
          roleBadge(member.role)
        )}
        {canManage && (
          <button
            type="button"
            title="Remove member"
            onClick={() => onRemove(member.userId)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function InviteSection({
  teamId,
  invites,
  callerRole,
  onInvitesChange,
}: {
  teamId: string;
  invites: TeamInvite[];
  callerRole: TeamRole;
  onInvitesChange: (invites: TeamInvite[]) => void;
}) {
  const [role, setRole] = useState<TeamRole>('member');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [newInvite, setNewInvite] = useState<TeamInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const canInvite = ROLE_RANK[callerRole] >= ROLE_RANK['admin'];

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const invite = await createInvite(teamId, {
        role,
        email: email.trim() || undefined,
        expiresInDays: 7,
      });
      setNewInvite(invite);
      setEmail('');
      onInvitesChange([invite, ...invites]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invite');
    } finally {
      setCreating(false);
    }
  };

  const inviteLink = newInvite
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${newInvite.token}`
    : null;

  const copyLink = () => {
    if (!inviteLink) return;
    void navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      await revokeInvite(teamId, inviteId);
      onInvitesChange(invites.filter((i) => i.id !== inviteId));
      if (newInvite?.id === inviteId) setNewInvite(null);
    } catch {
      /* ignore */
    }
  };

  const activeInvites = invites.filter((i) => !i.acceptedAt);

  return (
    <div className="space-y-3">
      {canInvite && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-sm"
              type="email"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="rounded border border-border bg-background px-2 text-sm"
            >
              {ROLES.filter((r) => r !== 'owner').map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Button size="sm" disabled={creating} onClick={() => void handleCreate()}>
              {creating ? 'Creating…' : 'Generate link'}
            </Button>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          {inviteLink ? (
            <div className="flex items-center gap-2 rounded border border-border bg-muted/40 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{inviteLink}</span>
              <button
                type="button"
                onClick={copyLink}
                className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {activeInvites.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Outstanding invites</p>
          {activeInvites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="font-mono text-xs truncate text-muted-foreground">{invite.token.slice(0, 12)}…</p>
                <p className="text-xs text-muted-foreground">
                  {invite.role}{invite.email ? ` · ${invite.email}` : ''} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                </p>
              </div>
              {canInvite && (
                <button
                  type="button"
                  title="Revoke invite"
                  onClick={() => void handleRevoke(invite.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function TeamSettingsPage({ params }: { params: { teamId: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rename state
  const [name, setName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { teamId } = params;

  useEffect(() => {
    Promise.all([getTeam(teamId), listInvites(teamId)])
      .then(([t, inv]) => {
        setTeam(t);
        setName(t.name);
        setInvites(inv);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load team'))
      .finally(() => setLoading(false));
  }, [teamId]);

  const callerMember = team?.members.find((m) => m.userId === user?.id);
  const callerRole: TeamRole = callerMember?.role ?? 'viewer';
  const isOwner = callerRole === 'owner';
  const canManage = ROLE_RANK[callerRole] >= ROLE_RANK['admin'];

  const handleRename = async () => {
    if (!name.trim() || name.trim() === team?.name) return;
    setNameSaving(true);
    setNameError(null);
    try {
      const updated = await updateTeam(teamId, { name: name.trim() });
      setTeam((t) => t ? { ...t, name: updated.name } : t);
      setNameSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setNameSaved(false), 1500);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not rename team');
    } finally {
      setNameSaving(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: TeamRole) => {
    try {
      await setMemberRole(teamId, memberId, role);
      setTeam((t) =>
        t ? { ...t, members: t.members.map((m) => m.userId === memberId ? { ...m, role } : m) } : t,
      );
    } catch {
      /* TODO: surface error */
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(teamId, memberId);
      setTeam((t) =>
        t ? { ...t, members: t.members.filter((m) => m.userId !== memberId) } : t,
      );
    } catch {
      /* TODO: surface error */
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTeam(teamId);
      router.push('/settings/team');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete team');
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error || !team) {
    return <p className="text-sm text-destructive">{error ?? 'Team not found'}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/settings/team" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-sm font-semibold">{team.name}</h2>
        <span className="text-xs text-muted-foreground font-mono">{team.slug}</span>
      </div>

      {/* Rename */}
      {canManage && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">General</p>
          <div className="space-y-1.5">
            <label htmlFor="team-name-edit" className="text-sm font-medium">Team name</label>
            <div className="flex gap-2">
              <Input
                id="team-name-edit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="max-w-xs"
              />
              <Button
                size="sm"
                disabled={!name.trim() || name.trim() === team.name || nameSaving}
                onClick={() => void handleRename()}
              >
                {nameSaving ? 'Saving…' : 'Save'}
              </Button>
              {nameSaved && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
            {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
          </div>
        </section>
      )}

      {/* Members */}
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
        <div className="divide-y divide-border rounded-md border border-border px-4">
          {team.members.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              currentUserId={user?.id ?? ''}
              callerRole={callerRole}
              onRoleChange={(uid, r) => void handleRoleChange(uid, r)}
              onRemove={(uid) => void handleRemoveMember(uid)}
            />
          ))}
        </div>
      </section>

      {/* Invite */}
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invite members</p>
        <InviteSection
          teamId={teamId}
          invites={invites}
          callerRole={callerRole}
          onInvitesChange={setInvites}
        />
      </section>

      {/* Danger zone */}
      {isOwner && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Danger zone</p>
          <div className="rounded-md border border-destructive/40 p-4 space-y-2">
            <p className="text-sm font-medium">Delete team</p>
            <p className="text-xs text-muted-foreground">
              Permanently delete this team and remove all members. This cannot be undone.
            </p>
            {!deleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setDeleteConfirm(true)}
              >
                Delete team
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

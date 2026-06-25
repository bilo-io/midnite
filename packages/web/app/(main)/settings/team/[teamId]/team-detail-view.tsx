'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ClipboardCopy, Trash2, UserMinus } from 'lucide-react';
import type { TeamInvite, TeamRole, TeamWithMembers } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createInvite,
  deleteTeam,
  getTeamWithMembers,
  listInvites,
  removeMember,
  revokeInvite,
  setMemberRole,
} from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { gatewayUrl } from '@/lib/api';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

const ROLE_OPTIONS: TeamRole[] = ['owner', 'admin', 'member', 'viewer'];

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <ClipboardCopy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}

export function TeamDetailView({ teamId }: { teamId: string }) {
  const { user, setActiveTeam } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite create state
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [creating, setCreating] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const myRole = team?.members.find((m) => m.userId === user?.id)?.role as TeamRole | undefined;
  const isAdminPlus = myRole === 'owner' || myRole === 'admin';
  const isOwner = myRole === 'owner';

  useEffect(() => {
    Promise.all([
      getTeamWithMembers(teamId),
      listInvites(teamId).catch(() => [] as TeamInvite[]),
    ])
      .then(([t, i]) => { setTeam(t); setInvites(i); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleCreateInvite = async () => {
    setInviteError(null);
    setCreating(true);
    try {
      const inv = await createInvite(teamId, { role: inviteRole, expiresInDays: 7 });
      setInvites((prev) => [inv, ...prev]);
    } catch (e) {
      setInviteError(errMsg(e));
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    await revokeInvite(teamId, inviteId).catch(() => undefined);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  const handleSetRole = async (userId: string, role: TeamRole) => {
    await setMemberRole(teamId, userId, role).catch(() => undefined);
    setTeam((prev) =>
      prev
        ? { ...prev, members: prev.members.map((m) => (m.userId === userId ? { ...m, role } : m)) }
        : prev,
    );
  };

  const handleRemoveMember = async (userId: string) => {
    await removeMember(teamId, userId).catch(() => undefined);
    setTeam((prev) =>
      prev ? { ...prev, members: prev.members.filter((m) => m.userId !== userId) } : prev,
    );
  };

  const handleDeleteTeam = async () => {
    setDeleting(true);
    try {
      await deleteTeam(teamId);
      setActiveTeam(null);
      router.push('/settings/team');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setDeleting(false);
    }
  };

  const inviteUrl = (token: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/invite?token=${encodeURIComponent(token)}`;

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!team) return null;

  const activeInvites = invites.filter((i) => !i.acceptedAt && new Date(i.expiresAt) > new Date());

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">{team.name}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">/{team.slug}</p>
      </div>

      {/* Members */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Members</h3>
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {team.members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <span className="text-sm truncate">{m.userId === user?.id ? `${user.name} (you)` : m.userId}</span>
              <div className="flex items-center gap-2 shrink-0">
                {isAdminPlus && m.userId !== user?.id ? (
                  <select
                    value={m.role}
                    onChange={(e) => void handleSetRole(m.userId, e.target.value as TeamRole)}
                    className="text-xs rounded border border-border bg-background px-1.5 py-0.5"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r} disabled={r === 'owner' && !isOwner}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                )}
                {isAdminPlus && m.userId !== user?.id && m.role !== 'owner' && (
                  <button
                    type="button"
                    aria-label="Remove member"
                    onClick={() => void handleRemoveMember(m.userId)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Invite tokens */}
      {isAdminPlus && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Invite link</h3>
          <div className="flex items-center gap-2">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamRole)}
              className="text-xs rounded border border-border bg-background px-2 py-1.5"
            >
              {ROLE_OPTIONS.filter((r) => r !== 'owner').map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => void handleCreateInvite()} disabled={creating}>
              {creating ? 'Generating…' : 'Generate link'}
            </Button>
          </div>
          {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}

          {activeInvites.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {activeInvites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between px-3 py-2 gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-mono truncate block">{inviteUrl(inv.token)}</span>
                    <span className="text-xs text-muted-foreground">
                      {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <CopyButton value={inviteUrl(inv.token)} label="invite link" />
                    <button
                      type="button"
                      aria-label="Revoke invite"
                      onClick={() => void handleRevokeInvite(inv.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Danger zone */}
      {isOwner && (
        <section className="space-y-3 rounded-lg border border-destructive/40 p-4">
          <h3 className="text-sm font-medium text-destructive">Danger zone</h3>
          {!confirmDelete ? (
            <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
              Delete team
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                This will permanently delete <strong>{team.name}</strong> and remove all members. Are you sure?
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => void handleDeleteTeam()} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

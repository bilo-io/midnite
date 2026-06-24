'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import type { Team } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createTeam, listMyTeams } from '@/lib/api';

function TeamRow({ team }: { team: Team }) {
  return (
    <Link
      href={`/settings/team/${team.id}`}
      className="flex items-center justify-between rounded-md border border-border px-4 py-3 hover:bg-accent/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-foreground">
          {team.name[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="text-sm font-medium">{team.name}</p>
          <p className="text-xs text-muted-foreground">{team.slug}</p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Settings →</span>
    </Link>
  );
}

function CreateTeamForm({ onCreated }: { onCreated: (t: Team) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  const handleCreate = async () => {
    const resolvedSlug = (slug.trim() || suggestedSlug).slice(0, 40);
    if (!name.trim() || !resolvedSlug) return;
    setSaving(true);
    setError(null);
    try {
      const team = await createTeam({ name: name.trim(), slug: resolvedSlug });
      setName('');
      setSlug('');
      setOpen(false);
      onCreated(team);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create team');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Create team
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <p className="text-sm font-medium">New team</p>
      <div className="space-y-1.5">
        <label htmlFor="team-name" className="text-xs font-medium">Team name</label>
        <Input
          id="team-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Engineering"
          maxLength={80}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="team-slug" className="text-xs font-medium">Slug</label>
        <Input
          id="team-slug"
          value={slug || suggestedSlug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="acme-engineering"
          maxLength={40}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">Lowercase, alphanumeric, hyphens only.</p>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" disabled={!name.trim() || saving} onClick={() => void handleCreate()}>
          {saving ? 'Creating…' : 'Create'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function SettingsTeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyTeams()
      .then((list) => setTeams(list))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load teams'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Your teams</h2>
        </div>
        <CreateTeamForm onCreated={(t) => setTeams((prev) => [...prev, t])} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No teams yet. Create one to start sharing work with others.
        </p>
      ) : (
        <div className="space-y-2">
          {teams.map((team) => (
            <TeamRow key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}

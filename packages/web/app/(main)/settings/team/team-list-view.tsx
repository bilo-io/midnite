'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, Users } from 'lucide-react';
import type { Team } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createTeam, listTeams } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

export function TeamListView() {
  const { teams: ctxTeams, setActiveTeam } = useAuth();
  const [teams, setTeams] = useState<Team[]>(ctxTeams);
  const [loading, setLoading] = useState(teams.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    listTeams()
      .then(setTeams)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  // Auto-derive slug from name
  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const handleCreate = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const team = await createTeam({ name: name.trim(), slug });
      setTeams((prev) => [...prev, { id: team.id, slug: team.slug, name: team.name, createdBy: team.createdBy, createdAt: team.createdAt }]);
      setActiveTeam(team.id);
      setName('');
      setSlug('');
      setShowCreate(false);
    } catch (e) {
      setCreateError(errMsg(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Teams</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Collaborate with others by joining or creating a team.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowCreate((s) => !s)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New team
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium">Create a team</p>
          <div className="space-y-2">
            <Input
              placeholder="Team name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={creating}
            />
            <Input
              placeholder="slug (url-safe)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={creating}
            />
          </div>
          {createError && <p className="text-xs text-destructive">{createError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void handleCreate()} disabled={creating || !name.trim() || !slug}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setCreateError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && teams.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">You're not in any teams yet.</p>
        </div>
      )}

      <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
        {teams.map((team) => (
          <li key={team.id}>
            <Link
              href={`/settings/team/detail?id=${encodeURIComponent(team.id)}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{team.name}</p>
                <p className="text-xs text-muted-foreground">{team.slug}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

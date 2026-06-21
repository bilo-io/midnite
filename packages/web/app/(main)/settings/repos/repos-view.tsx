'use client';

import { useEffect, useState } from 'react';
import { Check, FolderGit2, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Repo } from '@midnite/shared';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/confirm-dialog';
import { createRepo, deleteRepo, getRepos, updateRepo } from '@/lib/api';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

const byName = (a: Repo, b: Repo) => a.name.localeCompare(b.name);

/**
 * Settings > Repos — CRUD over the DB-backed repo registry. A repo is a named
 * checkout the orchestrator runs agents against; a task's `repo` resolves to its
 * path when the session's terminal opens.
 */
export function ReposView() {
  const confirm = useConfirm();
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPath, setEditPath] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    getRepos()
      .then(setRepos)
      .catch((e) => {
        setRepos([]);
        setError(errMsg(e));
      });
  }, []);

  const onAdd = async () => {
    setError(null);
    if (!name.trim() || !path.trim()) {
      setError('Both a name and a path are required.');
      return;
    }
    setAdding(true);
    try {
      const created = await createRepo({ name: name.trim(), path: path.trim() });
      setRepos((prev) => [...(prev ?? []), created].sort(byName));
      setName('');
      setPath('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (repo: Repo) => {
    setError(null);
    setEditingId(repo.id);
    setEditName(repo.name);
    setEditPath(repo.path);
  };

  const onSaveEdit = async (id: string) => {
    setError(null);
    if (!editName.trim() || !editPath.trim()) {
      setError('Both a name and a path are required.');
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await updateRepo(id, { name: editName.trim(), path: editPath.trim() });
      setRepos((prev) => (prev ?? []).map((r) => (r.id === id ? updated : r)).sort(byName));
      setEditingId(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSavingEdit(false);
    }
  };

  const onRemove = async (repo: Repo) => {
    const ok = await confirm({
      title: `Remove “${repo.name}”?`,
      description: 'Tasks referencing it fall back to the default working directory.',
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteRepo(repo.id);
      setRepos((prev) => (prev ?? []).filter((r) => r.id !== repo.id));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="space-y-4">
      <Accordion
        title="Repos"
        icon={<FolderGit2 className="h-3.5 w-3.5" />}
        count={repos?.length}
        defaultOpen
      >
        <div className="space-y-4 p-5">
          <p className="text-xs text-muted-foreground">
            Named checkouts the orchestrator runs agents against. A task’s repo resolves to the
            checkout’s folder when its session opens. Paths may use <code>~</code> for your home
            directory.
          </p>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {repos === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : repos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No repos yet — add one below.</p>
          ) : (
            <ul className="space-y-2">
              {repos.map((repo) =>
                editingId === repo.id ? (
                  <li
                    key={repo.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/20 p-2"
                  >
                    <Input
                      aria-label="Repo name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-32"
                    />
                    <Input
                      aria-label="Repo path"
                      value={editPath}
                      onChange={(e) => setEditPath(e.target.value)}
                      className="min-w-0 flex-1"
                    />
                    <Button size="sm" onClick={() => onSaveEdit(repo.id)} disabled={savingEdit}>
                      <Check className="h-3.5 w-3.5" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      disabled={savingEdit}
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </li>
                ) : (
                  <li
                    key={repo.id}
                    className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{repo.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{repo.path}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Edit ${repo.name}`}
                      onClick={() => startEdit(repo)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${repo.name}`}
                      onClick={() => onRemove(repo)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ),
              )}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-2 border-t border-border/60 pt-4">
            <div className="space-y-1">
              <label htmlFor="repo-name" className="text-xs font-medium text-muted-foreground">
                Name
              </label>
              <Input
                id="repo-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="api"
                className="w-32"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <label htmlFor="repo-path" className="text-xs font-medium text-muted-foreground">
                Path
              </label>
              <Input
                id="repo-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="~/Dev/api"
              />
            </div>
            <Button onClick={onAdd} disabled={adding}>
              <Plus className="h-4 w-4" /> Add repo
            </Button>
          </div>
        </div>
      </Accordion>
    </div>
  );
}

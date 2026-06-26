'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, FileText, Loader2, Plus, RefreshCw, Sprout, Trash2 } from 'lucide-react';
import type { PhaseDoc, Repo } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from '@/components/markdown-editor';
import { useConfirm } from '@/components/confirm-dialog';
import { SeedTasksModal } from '@/components/projects/phase-docs/SeedTasksModal';
import {
  ApiError,
  createPhaseDoc,
  deletePhaseDoc,
  getPhaseDoc,
  getRepos,
  listPhaseDocs,
  updatePhaseDoc,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

/** Editing a new (no sha yet) or existing phase doc. */
type EditState = { name: string; content: string; sha: string | null; isNew: boolean };

type Props = { projectId: string };

/**
 * Phase 42 Theme C — the "Phase docs" tab. Pick a repo (the project's GitHub
 * target isn't stored), list `.midnite/phases/*.md`, and edit/create/delete them.
 * Reads/writes go through the gateway, which proxies the GitHub Contents API via
 * the local `gh` CLI. A stale-SHA `409` on save surfaces a reload-and-retry notice.
 */
export function PhaseDocsTab({ projectId }: Props) {
  const confirm = useConfirm();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [repoId, setRepoId] = useState<string>('');
  const [docs, setDocs] = useState<PhaseDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  // Filename whose tasks are being seeded (opens SeedTasksModal); notice after.
  const [seedFilename, setSeedFilename] = useState<string | null>(null);
  const [seededNotice, setSeededNotice] = useState<string | null>(null);

  // Only repos with a GitHub owner/repo slug can host phase docs.
  const eligibleRepos = repos.filter((r) => r.ownerRepo);

  useEffect(() => {
    getRepos()
      .then(setRepos)
      .catch((e) => setError(errMsg(e)));
  }, []);

  const refresh = useCallback(
    async (id: string) => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        setDocs(await listPhaseDocs(projectId, id));
      } catch (e) {
        setError(errMsg(e));
        setDocs([]);
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  const selectRepo = (id: string) => {
    setRepoId(id);
    setEdit(null);
    void refresh(id);
  };

  const openDoc = async (filename: string) => {
    setError(null);
    setConflict(false);
    try {
      const doc = await getPhaseDoc(projectId, repoId, filename);
      setEdit({ name: doc.name, content: doc.content, sha: doc.sha, isNew: false });
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const newDoc = () => {
    setError(null);
    setConflict(false);
    setEdit({ name: '', content: '# \n', sha: null, isNew: true });
  };

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    setError(null);
    setConflict(false);
    try {
      if (edit.isNew) {
        if (!edit.name.trim()) {
          setError('Give the phase doc a name.');
          return;
        }
        await createPhaseDoc(projectId, repoId, { name: edit.name, content: edit.content });
      } else {
        await updatePhaseDoc(projectId, repoId, edit.name, {
          content: edit.content,
          sha: edit.sha ?? '',
        });
      }
      setEdit(null);
      await refresh(repoId);
    } catch (e) {
      // A stale SHA means the file changed on the remote since we loaded it.
      if (e instanceof ApiError && e.status === 409) setConflict(true);
      else setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const removeDoc = async (doc: PhaseDoc) => {
    const ok = await confirm({
      title: `Delete "${doc.name}"?`,
      description: 'This commits a deletion of the file in the linked repo.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setError(null);
    try {
      await deletePhaseDoc(projectId, repoId, doc.name, doc.sha);
      await refresh(repoId);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  // --- Empty state: no repo with a GitHub slug is configured at all. ---
  if (repos.length > 0 && eligibleRepos.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
        Link a repo with a GitHub <code>owner/repo</code> slug to author phase docs here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor="phase-docs-repo" className="text-xs font-medium text-muted-foreground">
          Repo
        </label>
        <select
          id="phase-docs-repo"
          className={cn(inputClass, 'h-8 max-w-xs')}
          value={repoId}
          onChange={(e) => selectRepo(e.target.value)}
        >
          <option value="">Select a repo…</option>
          {eligibleRepos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.ownerRepo})
            </option>
          ))}
        </select>
        {repoId && !edit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh phase docs"
            onClick={() => void refresh(repoId)}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!repoId ? (
        <p className="text-sm text-muted-foreground">
          Pick a repo to list its <code>.midnite/phases/*.md</code> docs.
        </p>
      ) : edit ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEdit(null)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>

          {edit.isNew ? (
            <input
              className={inputClass}
              placeholder="Phase doc name (e.g. Auth revamp)"
              aria-label="Phase doc name"
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />
          ) : (
            <p className="text-sm font-medium">{edit.name}</p>
          )}

          {conflict ? (
            <p
              role="alert"
              className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <span>This doc changed on the remote. Reload to get the latest, then re-apply.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void openDoc(edit.name)}
              >
                Reload
              </Button>
            </p>
          ) : null}

          <MarkdownEditor
            value={edit.content}
            onChange={(content) => setEdit({ ...edit, content })}
            ariaLabel="Phase doc content"
            defaultMode="edit"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={newDoc}>
              <Plus className="mr-1 h-4 w-4" /> New phase doc
            </Button>
          </div>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : docs.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
              No phase docs yet. Create one to start tracking a phase in this repo.
            </p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-md border border-border/60">
              {docs.map((doc) => (
                <li key={doc.path} className="flex items-center gap-2 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <button
                    type="button"
                    className="flex-1 truncate text-left text-sm hover:underline"
                    onClick={() => void openDoc(doc.name)}
                  >
                    {doc.name}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Seed tasks from ${doc.name}`}
                    onClick={() => {
                      setSeededNotice(null);
                      setSeedFilename(doc.name);
                    }}
                  >
                    <Sprout className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${doc.name}`}
                    onClick={() => void removeDoc(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {seededNotice ? (
            <p role="status" className="text-sm text-muted-foreground">
              {seededNotice}
            </p>
          ) : null}
        </div>
      )}

      {seedFilename ? (
        <SeedTasksModal
          projectId={projectId}
          repoId={repoId}
          filename={seedFilename}
          onClose={() => setSeedFilename(null)}
          onSeeded={(count) =>
            setSeededNotice(
              `Seeded ${count} task${count === 1 ? '' : 's'} from ${seedFilename} onto the board.`,
            )
          }
        />
      ) : null}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { RepoStatusResponse } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { getRepoStatus, initRepo } from '@/lib/api';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

type Props = {
  projectId: string;
  /** The project's (possibly unsaved) work directory draft — `undefined`/empty
   *  skips the network call entirely and renders "No folder set". */
  workDir: string | undefined;
};

/**
 * Compact repo status for a project's `workDir` (local git status only — no
 * remote/clone support). Lives in `ProjectDetailsPanel` right below the work
 * directory field it reports on. `workDir` is read straight from the draft
 * state so "No folder set" never needs a round-trip, and a re-fetch fires
 * whenever the saved directory changes.
 */
export function ProjectRepoStatus({ projectId, workDir }: Props) {
  const [status, setStatus] = useState<RepoStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initing, setIniting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workDir) {
      setStatus(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStatus(await getRepoStatus(projectId));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, workDir]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const init = async () => {
    setIniting(true);
    setError(null);
    try {
      setStatus(await initRepo(projectId));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setIniting(false);
    }
  };

  if (!workDir) {
    return <p className="text-xs text-muted-foreground">No folder set</p>;
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking repo status…
      </p>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }

  if (!status) return null;

  if (!status.exists) {
    return <p className="text-xs text-destructive/80">Folder not found</p>;
  }

  if (!status.isRepo) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Not a git repo</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => void init()}
          disabled={initing}
        >
          {initing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
          Init repo
        </Button>
      </div>
    );
  }

  if (status.error) {
    return <p className="text-xs text-muted-foreground">Repo status unavailable: {status.error}</p>;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${status.dirty ? 'bg-amber-500' : 'bg-emerald-500'}`}
      />
      <span className="font-mono">{status.branch}</span>
      <span className="text-muted-foreground">{status.dirty ? '· uncommitted changes' : '· clean'}</span>
    </div>
  );
}

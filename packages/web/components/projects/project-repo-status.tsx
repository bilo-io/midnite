'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import type { RepoStatusResponse } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { getProjectRepoStatus, getRepoStatus, initRepo } from '@/lib/api';

type Props = {
  projectId: string;
  /** The directory being reported on — the project's (possibly unsaved) work
   *  directory draft, or an attached repo's path. `undefined`/empty skips the
   *  network call entirely and renders "No folder set". */
  workDir: string | undefined;
  /**
   * Phase 84 C — report on one **attached repo** instead of the project's
   * effective work directory. `git init` is hidden in this mode: the init route
   * targets the project's directory, and a registered repo that isn't a git repo
   * is a registry problem, not something to silently fix from here.
   */
  repoId?: string;
};

/**
 * Compact repo status for a project's `workDir` (local git status only — no
 * remote/clone support). Lives in `ProjectDetailsPanel` right below the work
 * directory field it reports on. `workDir` is read straight from the draft
 * state so "No folder set" never needs a round-trip, and a re-fetch fires
 * whenever the saved directory changes.
 */
export function ProjectRepoStatus({ projectId, workDir, repoId }: Props) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const [status, setStatus] = useState<RepoStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initing, setIniting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errMsg = useCallback(
    (e: unknown): string => (e instanceof Error ? e.message : tCommon('errorTitle')),
    [tCommon],
  );

  const refresh = useCallback(async () => {
    if (!workDir) {
      setStatus(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStatus(repoId ? await getProjectRepoStatus(projectId, repoId) : await getRepoStatus(projectId));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, repoId, workDir, errMsg]);

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
    return <p className="text-xs text-muted-foreground">{t('repoStatus.noFolder')}</p>;
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('repoStatus.checking')}
      </p>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }

  if (!status) return null;

  if (!status.exists) {
    return <p className="text-xs text-destructive/80">{t('repoStatus.folderNotFound')}</p>;
  }

  if (!status.isRepo) {
    if (repoId) {
      return <span className="text-xs text-muted-foreground">{t('repoStatus.notARepo')}</span>;
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{t('repoStatus.notARepo')}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => void init()}
          disabled={initing}
        >
          {initing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
          {t('repoStatus.initRepo')}
        </Button>
      </div>
    );
  }

  if (status.error) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('repoStatus.unavailable', { message: status.error })}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${status.dirty ? 'bg-amber-500' : 'bg-emerald-500'}`}
      />
      <span className="font-mono">{status.branch}</span>
      <span className="text-muted-foreground">
        {status.dirty ? t('repoStatus.uncommitted') : t('repoStatus.clean')}
      </span>
    </div>
  );
}

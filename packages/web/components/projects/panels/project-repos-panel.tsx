'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { GitBranch, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import type { Project, ProjectRepo, Repo } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import { ProjectRepoStatus } from '@/components/projects/project-repo-status';
import {
  attachProjectRepo,
  detachProjectRepo,
  getRepos,
  listProjectRepos,
  setProjectRepoPrimary,
} from '@/lib/api';

type Props = {
  project: Project;
  /** Bubbles up so the detail view can refresh the project (its effective
   *  working directory moves whenever the primary changes). */
  onChanged?: () => void;
};

/**
 * The project's repos (Phase 84 Theme C). A project spans many checkouts; the
 * **primary** one is its effective working directory — where its agents spawn,
 * where preview/build run, and what the git-status card reports on — so the
 * primary marker is the consequential control here, not decoration.
 */
export function ProjectReposPanel({ project, onChanged }: Props) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');

  const [attached, setAttached] = useState<ProjectRepo[]>(project.repos ?? []);
  const [registry, setRegistry] = useState<Repo[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const errMsg = useCallback(
    (e: unknown): string => (e instanceof Error ? e.message : tCommon('errorTitle')),
    [tCommon],
  );

  // The registry backs the add-picker; the attached list comes from the project
  // but is re-read once so a stale prop can't hide a repo added elsewhere.
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [repos, mine] = await Promise.all([getRepos(), listProjectRepos(project.id)]);
        if (!live) return;
        setRegistry(repos);
        setAttached(mine);
      } catch (e) {
        if (live) setError(errMsg(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [project.id, errMsg]);

  const run = async (key: string, op: () => Promise<ProjectRepo[]>) => {
    setBusy(key);
    setError(null);
    try {
      setAttached(await op());
      onChanged?.();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  // Detaching the primary is the case worth spelling out: it moves the project's
  // working directory to whichever repo gets promoted next.
  const askDetach = async (repo: ProjectRepo) => {
    const ok = await confirm({
      title: t('repos.detachTitle'),
      description:
        repo.isPrimary && attached.length > 1
          ? t('repos.detachPrimaryMessage', { name: repo.name })
          : t('repos.detachMessage', { name: repo.name }),
      confirmLabel: t('repos.detachConfirm'),
    });
    if (ok) await run(repo.repoId, () => detachProjectRepo(project.id, repo.repoId));
  };

  const attachedIds = new Set(attached.map((r) => r.repoId));
  const available = registry.filter((r) => !attachedIds.has(r.id));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{t('repos.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('repos.description')}</p>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {attached.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
          {project.workDir
            ? t('repos.emptyWithWorkDir', { workDir: project.workDir })
            : t('repos.empty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {attached.map((repo) => (
            <li
              key={repo.repoId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border/60 bg-card/40 p-3"
            >
              <GitBranch aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{repo.name}</span>
                  {repo.isPrimary ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      {t('repos.primary')}
                    </span>
                  ) : null}
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">{repo.path}</p>
                <ProjectRepoStatus projectId={project.id} repoId={repo.repoId} workDir={repo.path} />
              </div>
              <div className="flex items-center gap-1">
                {!repo.isPrimary ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={busy !== null}
                    onClick={() =>
                      void run(repo.repoId, () => setProjectRepoPrimary(project.id, repo.repoId))
                    }
                  >
                    {busy === repo.repoId ? (
                      <Loader2 aria-hidden className="h-3 w-3 animate-spin" />
                    ) : (
                      <Star aria-hidden className="h-3 w-3" />
                    )}
                    {t('repos.makePrimary')}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  aria-label={t('repos.detachAria', { name: repo.name })}
                  disabled={busy !== null}
                  onClick={() => void askDetach(repo)}
                >
                  <Trash2 aria-hidden className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="attach-repo" className="sr-only">
          {t('repos.addLabel')}
        </label>
        <select
          id="attach-repo"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={available.length === 0 || busy !== null}
          className="h-8 min-w-48 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="">
            {available.length === 0 ? t('repos.allAttached') : t('repos.choosePlaceholder')}
          </option>
          {available.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5"
          disabled={!selected || busy !== null}
          onClick={() =>
            void run('attach', async () => {
              const next = await attachProjectRepo(project.id, { repoId: selected });
              setSelected('');
              return next;
            })
          }
        >
          {busy === 'attach' ? (
            <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus aria-hidden className="h-3.5 w-3.5" />
          )}
          {t('repos.attach')}
        </Button>
      </div>

    </div>
  );
}

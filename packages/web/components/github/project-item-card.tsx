'use client';

import * as React from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, Unlink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GithubIcon, StyledSelect, type SelectOption } from '@midnite/ui';
import type { GithubProject, GithubProjectItem } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import {
  ApiError,
  getGithubProjects,
  linkTaskProjectItem,
  refreshTaskProjectItem,
  unlinkTaskProjectItem,
} from '@/lib/api';

/**
 * The task's GitHub Projects v2 link (Phase 84 Theme E).
 *
 * The column shown is the item's **real column on GitHub** as of the last read — not
 * whatever midnite last pushed. That distinction is the point: read-back is display-only
 * this phase, so the card must never imply midnite is the source of truth for it.
 *
 * `lastError` is rendered rather than swallowed. A silent stall is the failure mode the
 * phase doc warns about, and "the column looks stale" is unanswerable without it.
 */
export type ProjectItemCardProps = {
  taskId: string;
  /** Existing link, or null when unlinked. */
  item: GithubProjectItem | null;
  onChange: (item: GithubProjectItem | null) => void;
};

export function ProjectItemCard({ taskId, item, onChange }: ProjectItemCardProps) {
  const t = useTranslations('task');
  const confirm = useConfirm();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [projects, setProjects] = React.useState<GithubProject[] | null>(null);
  const [chosen, setChosen] = React.useState('');
  const [picking, setPicking] = React.useState(false);

  /** 409/403 carry a machine-readable code; anything else is just a message. */
  const describe = (e: unknown): string => {
    if (e instanceof ApiError && e.status === 409) return t('githubProject.notConnected');
    if (e instanceof ApiError && e.status === 403) return t('githubProject.scopeMissing');
    return e instanceof Error ? e.message : t('githubProject.genericError');
  };

  const startPicking = async () => {
    setPicking(true);
    setError(null);
    try {
      const list = await getGithubProjects();
      setProjects(list);
      if (list.length > 0) setChosen(list[0]!.nodeId);
    } catch (e) {
      setError(describe(e));
      setProjects([]);
    }
  };

  const doLink = async () => {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await linkTaskProjectItem(taskId, { projectNodeId: chosen }));
      setPicking(false);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  };

  const doRefresh = async () => {
    setBusy(true);
    setError(null);
    try {
      onChange(await refreshTaskProjectItem(taskId));
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  };

  const doUnlink = async () => {
    const ok = await confirm({
      title: t('githubProject.unlink.title'),
      description: t('githubProject.unlink.description'),
      tone: 'warning',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await unlinkTaskProjectItem(taskId);
      onChange(null);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  };

  const projectOptions: SelectOption<string>[] = (projects ?? []).map((p) => ({
    value: p.nodeId,
    label: p.closed
      ? t('githubProject.closedBoard', { title: p.title, owner: p.ownerLogin })
      : t('githubProject.board', { title: p.title, owner: p.ownerLogin }),
  }));

  return (
    <section className="rounded-lg border border-border/60 bg-muted/10 p-4">
      <header className="flex items-center gap-2">
        <GithubIcon className="shrink-0 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{t('githubProject.title')}</h3>
        {item ? (
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label={t('githubProject.refresh')}
              disabled={busy}
              onClick={() => void doRefresh()}
            >
              <RefreshCw className={busy ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={t('githubProject.unlink.action')}
              disabled={busy}
              onClick={() => void doUnlink()}
            >
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {item ? (
        <div className="mt-3 space-y-2">
          <a
            href={item.itemUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {item.projectTitle}
            <ExternalLink className="h-3 w-3" />
          </a>
          <p className="text-xs text-muted-foreground">
            {item.statusOptionName
              ? // Deliberately "on GitHub" — this is the remote column, not ours.
                t('githubProject.remoteColumn', { column: item.statusOptionName })
              : t('githubProject.noColumn')}
          </p>
          {item.mappings.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('githubProject.noMapping')}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('githubProject.mappedCount', { count: item.mappings.length })}
            </p>
          )}
          {item.lastSyncedAt ? (
            <p className="text-[11px] text-muted-foreground">
              {t('githubProject.lastSynced', { at: new Date(item.lastSyncedAt).toLocaleString() })}
            </p>
          ) : null}
          {item.lastError ? (
            <p className="flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {t('githubProject.lastError', { error: item.lastError })}
            </p>
          ) : null}
        </div>
      ) : picking ? (
        <div className="mt-3 space-y-2">
          {projects === null ? (
            <p className="text-sm text-muted-foreground">{t('githubProject.loadingBoards')}</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('githubProject.noBoards')}</p>
          ) : (
            <>
              <StyledSelect
                options={projectOptions}
                value={chosen}
                onChange={setChosen}
                aria-label={t('githubProject.chooseBoard')}
              />
              <p className="text-xs text-muted-foreground">{t('githubProject.createsDraft')}</p>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy || !chosen} onClick={() => void doLink()}>
                  {t('githubProject.link')}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPicking(false)}>
                  {t('githubProject.cancel')}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">{t('githubProject.empty')}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => void startPicking()}>
            {t('githubProject.linkAction')}
          </Button>
        </div>
      )}
    </section>
  );
}

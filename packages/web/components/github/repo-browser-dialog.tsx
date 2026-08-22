'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Check,
  FolderGit2,
  Lock,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GithubRepo, GithubReposResponse, Repo } from '@midnite/shared';
import { GithubIcon } from '@midnite/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, getGithubRepos, importGithubRepo } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Browse the connected GitHub account's repositories and import one into the registry
 * (Phase 84 Theme B).
 *
 * Each row carries one of three states, which is the whole reason this beats typing a
 * name, a path and an `owner/repo` slug by hand:
 *
 * - **registered** — already a midnite repo; nothing to do
 * - **on disk** — matched to a checkout by its git remote, so importing needs no typing
 * - **not checked out** — nothing local to point at, so it hands off to the create form
 *   prefilled rather than landing a pathless row the board would fail to spawn in
 *
 * Portalled to `document.body` with fixed positioning, per the web overlay convention.
 */
export type RepoBrowserDialogProps = {
  open: boolean;
  onClose: () => void;
  /** A repo was imported — the caller folds it into its list. */
  onImported: (repo: Repo) => void;
  /**
   * A repo with no local checkout was chosen. The caller prefills its create form with
   * these (the path is the user's to supply) instead of importing.
   */
  onPrefill: (draft: { name: string; ownerRepo: string }) => void;
};

export function RepoBrowserDialog({ open, onClose, onImported, onPrefill }: RepoBrowserDialogProps) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [data, setData] = React.useState<GithubReposResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notConnected, setNotConnected] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [owner, setOwner] = React.useState('');
  const [importingId, setImportingId] = React.useState<number | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Monotonic request id. A double-clicked Refresh (or a close-then-reopen) has two
  // fetches in flight; without this the slower one can land last and overwrite the newer
  // list, and the spinner would stop while a request was still running.
  const requestId = React.useRef(0);

  const load = React.useCallback(
    async (refresh: boolean) => {
      const id = (requestId.current += 1);
      setLoading(true);
      setError(null);
      setNotConnected(false);
      try {
        const next = await getGithubRepos({ refresh });
        if (requestId.current !== id) return;
        setData(next);
      } catch (e) {
        if (requestId.current !== id) return;
        // 409 is the gateway's "no GitHub token resolvable" — a prompt, not a failure.
        if (e instanceof ApiError && e.status === 409) setNotConnected(true);
        else setError(e instanceof Error ? e.message : t('repos.errors.generic'));
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    },
    [t],
  );

  React.useEffect(() => {
    if (!open) return;
    void load(false);
  }, [open, load]);

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const owners = React.useMemo(
    () => [...new Set((data?.items ?? []).map((r) => r.owner))].sort((a, b) => a.localeCompare(b)),
    [data],
  );

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.items ?? []).filter((r) => {
      if (owner && r.owner !== owner) return false;
      if (!needle) return true;
      return (
        r.ownerRepo.toLowerCase().includes(needle) ||
        (r.description ?? '').toLowerCase().includes(needle)
      );
    });
  }, [data, query, owner]);

  const onSelect = async (repo: GithubRepo) => {
    if (repo.registeredRepoId) return;
    if (repo.checkoutState === 'not-checked-out') {
      onPrefill({ name: repo.name, ownerRepo: repo.ownerRepo });
      onClose();
      return;
    }
    setImportingId(repo.id);
    setError(null);
    try {
      onImported(await importGithubRepo({ ownerRepo: repo.ownerRepo }));
      // Re-annotate in place so the row flips to "registered" without a refetch.
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((r) =>
                r.id === repo.id ? { ...r, checkoutState: 'registered' as const } : r,
              ),
            }
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('repos.errors.generic'));
    } finally {
      setImportingId(null);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('repos.browse.title')}
        className="animate-dialog-in relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-center gap-2 border-b border-border/60 p-4">
          <GithubIcon className="shrink-0 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t('repos.browse.title')}</h2>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            aria-label={t('repos.browse.refresh')}
            disabled={loading}
            onClick={() => void load(true)}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
          <Button size="sm" variant="ghost" aria-label={tc('close')} onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </header>

        {notConnected ? (
          <div className="space-y-2 p-6 text-center">
            <GithubIcon className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">{t('repos.browse.notConnected.title')}</p>
            <p className="text-xs text-muted-foreground">
              {t('repos.browse.notConnected.description')}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  aria-label={t('repos.browse.searchLabel')}
                  placeholder={t('repos.browse.searchPlaceholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-7"
                />
              </div>
              {owners.length > 1 ? (
                <select
                  aria-label={t('repos.browse.ownerLabel')}
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="">{t('repos.browse.allOwners')}</option>
                  {owners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="px-4 pt-3 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {data === null && loading ? (
                <p className="p-3 text-sm text-muted-foreground">{tc('loading')}</p>
              ) : visible.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">{t('repos.browse.noMatches')}</p>
              ) : (
                <ul className="space-y-1.5">
                  {visible.map((repo) => (
                    <RepoRow
                      key={repo.id}
                      repo={repo}
                      busy={importingId === repo.id}
                      onSelect={() => void onSelect(repo)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <footer className="border-t border-border/60 px-4 py-2">
              <p className="text-[11px] text-muted-foreground">
                {data && data.scannedRoots.length > 0
                  ? t('repos.browse.scannedRoots', { roots: data.scannedRoots.join(', ') })
                  : t('repos.browse.noScanRoots')}
              </p>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function RepoRow({
  repo,
  busy,
  onSelect,
}: {
  repo: GithubRepo;
  busy: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations('settings');
  const registered = repo.checkoutState === 'registered';
  return (
    <li className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 p-2.5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {repo.ownerRepo}
          {repo.private ? (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label={t('repos.browse.private')} />
          ) : null}
          {repo.archived ? (
            <span className="text-[10px] uppercase text-muted-foreground">
              {t('repos.browse.archived')}
            </span>
          ) : null}
        </p>
        {repo.description ? (
          <p className="truncate text-xs text-muted-foreground">{repo.description}</p>
        ) : null}
        <p className="mt-0.5 flex items-center gap-1 text-xs">
          {registered ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="h-3 w-3" />
              {t('repos.browse.states.registered')}
            </span>
          ) : repo.checkoutState === 'on-disk' ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <FolderGit2 className="h-3 w-3" />
              {t('repos.browse.states.onDisk', { path: repo.localPath ?? '' })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              {t('repos.browse.states.notCheckedOut')}
            </span>
          )}
        </p>
      </div>
      <Button size="sm" variant={registered ? 'ghost' : 'default'} disabled={registered || busy} onClick={onSelect}>
        {registered
          ? t('repos.browse.actions.added')
          : repo.checkoutState === 'on-disk'
            ? t('repos.browse.actions.import')
            : t('repos.browse.actions.addManually')}
      </Button>
    </li>
  );
}

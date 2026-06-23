'use client';

import { FolderGit2, RefreshCw } from 'lucide-react';
import { getRepos, getTasks } from '@/lib/api';
import { summarizeByRepo, type RepoStatusRow } from '@/lib/repo-status';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 15_000;

/**
 * Per-repo status widget (Phase 7 Theme C, unblocked by repos-first-class): how
 * the fleet is spread across repos at a glance — in-flight agents (running) and
 * queue depth (queued) per registered repo, plus an Unassigned bucket. Polls the
 * board; the task WS broadcast also refreshes it. Sorted by activity.
 */
export function RepoStatusWidget() {
  const { data, error, loading, refresh } = usePolling(
    () => Promise.all([getTasks(), getRepos()]),
    REFRESH_MS,
  );

  const rows = data ? summarizeByRepo(data[0], data[1]) : [];

  return (
    <WidgetCard
      title="Per-repo status"
      icon={FolderGit2}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh repo status"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto"
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load repo status.</p>
      ) : !data && loading ? (
        <WidgetLoader />
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No repos registered — add one in Settings → Repos.
        </p>
      ) : (
        <ul className="divide-y divide-border/30">
          {rows.map((row) => (
            <RepoRow key={row.repo ?? '__unassigned__'} row={row} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

function RepoRow({ row }: { row: RepoStatusRow }) {
  return (
    <li className="flex items-center gap-2 px-4 py-2">
      <span
        className={cn('min-w-0 flex-1 truncate text-sm', row.repo === null && 'italic text-muted-foreground')}
        title={row.label}
      >
        {row.label}
      </span>
      <div className="flex shrink-0 items-center gap-2.5 tabular-nums">
        <Stat n={row.running} hue="--status-wip" word="running" />
        <Stat n={row.queued} hue="--status-todo" word="queued" />
        <Stat n={row.done} hue="--status-done" word="done" muted />
      </div>
    </li>
  );
}

/** One count chip: a status-coloured dot + number, dimmed when zero. */
function Stat({ n, hue, word, muted }: { n: number; hue: string; word: string; muted?: boolean }) {
  return (
    <span
      className={cn('flex items-center gap-1 text-xs', (n === 0 || muted) && 'text-muted-foreground', n === 0 && 'opacity-50')}
      aria-label={`${n} ${word}`}
    >
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: `hsl(var(${hue}))` }}
      />
      {n}
    </span>
  );
}

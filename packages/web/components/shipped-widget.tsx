'use client';

import { ExternalLink, GitPullRequest, RefreshCw, Rocket } from 'lucide-react';
import type { Task } from '@midnite/shared';
import { getTasks } from '@/lib/api';
import { PrStatusChip } from '@/components/pr-status-chip';
import { usePolling } from '@/lib/use-polling';
import { cn, relativeTime } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 30_000;
const MAX_ROWS = 8;

/** Most-recently-completed first; falls back to created order when updatedAt is absent. */
function shippedSortKey(t: Task): string {
  return t.updatedAt ?? t.createdAt ?? '';
}

export function ShippedWidget() {
  const { data, error, loading, refresh } = usePolling(() => getTasks(), REFRESH_MS);

  const shipped = (data ?? [])
    .filter((t) => t.status === 'done' && !t.archivedAt)
    .sort((a, b) => shippedSortKey(b).localeCompare(shippedSortKey(a)))
    .slice(0, MAX_ROWS);

  return (
    <WidgetCard
      title="Shipped"
      icon={Rocket}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh shipped work"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto"
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load shipped work.</p>
      ) : !data && loading ? (
        <WidgetLoader />
      ) : shipped.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing shipped yet.</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {shipped.map((t) => (
            <ShippedRow key={t.id} task={t} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

function ShippedRow({ task }: { task: Task }) {
  const when = task.updatedAt ?? task.createdAt;
  return (
    <li className="px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
        {when && (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {relativeTime(when)}
          </span>
        )}
      </div>
      {task.prUrl ? (
        <div className="mt-0.5 flex items-center gap-1.5">
          {task.prStatus ? (
            <PrStatusChip status={task.prStatus} />
          ) : (
            <GitPullRequest className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
          <a
            href={task.prUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-w-0 items-center gap-1 text-[11px] text-primary hover:underline"
            title={task.prUrl}
          >
            <span className="truncate">{prLabel(task.prUrl)}</span>
            <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
          </a>
        </div>
      ) : (
        <span className="mt-0.5 block text-[11px] text-muted-foreground">no PR linked</span>
      )}
    </li>
  );
}

/** Compact PR label: "owner/repo#123" from a GitHub PR URL, else the bare URL. */
function prLabel(url: string): string {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  return m ? `${m[1]}/${m[2]}#${m[3]}` : url.replace(/^https?:\/\//, '');
}

'use client';

import { Activity, RefreshCw } from 'lucide-react';
import type { Task } from '@midnite/shared';
import { getTasks } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn, relativeTime } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 20_000;
const MAX_ROWS = 12;

type Entry = { id: string; title: string; kind: string; at: number };

function humanizeKind(kind: string): string {
  const text = kind.replace(/[._-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toEntries(tasks: Task[]): Entry[] {
  const entries: Entry[] = [];
  for (const task of tasks) {
    for (let i = 0; i < task.events.length; i++) {
      const ev = task.events[i]!;
      const at = new Date(ev.at).getTime();
      if (!Number.isFinite(at)) continue;
      entries.push({ id: `${task.id}:${i}`, title: task.title, kind: ev.kind, at });
    }
  }
  return entries.sort((a, b) => b.at - a.at).slice(0, MAX_ROWS);
}

export function ActivityWidget() {
  const { data, error, loading, refresh } = usePolling(() => getTasks(), REFRESH_MS);

  const entries = data ? toEntries(data) : [];

  return (
    <WidgetCard
      title="Activity feed"
      icon={Activity}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh activity"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto"
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load activity.</p>
      ) : !data && loading ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {entries.map((e) => (
            <li key={e.id} className="flex items-baseline gap-2 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {humanizeKind(e.kind)}
                </span>
                <span className="block truncate text-sm">{e.title}</span>
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{relativeTime(e.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

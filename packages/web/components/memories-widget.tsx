'use client';

import { Brain, RefreshCw } from 'lucide-react';
import type { Memory } from '@midnite/shared';
import { getMemories } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn, relativeTime } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 60_000;
const MAX_ROWS = 6;

export function MemoriesWidget() {
  const { data, error, loading, refresh } = usePolling(() => getMemories(), REFRESH_MS);

  const memories = (data ?? [])
    .filter((m) => !m.archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_ROWS);

  return (
    <WidgetCard
      title="Recent memories"
      icon={Brain}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh memories"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto"
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load memories.</p>
      ) : !data && loading ? (
        <WidgetLoader />
      ) : memories.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No memories yet.</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {memories.map((m) => (
            <MemoryRow key={m.id} memory={m} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

function MemoryRow({ memory: m }: { memory: Memory }) {
  return (
    <li className="px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.title}</span>
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            m.projectId === null ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {m.projectId === null ? 'Global' : 'Project'}
        </span>
      </div>
      {m.content && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{m.content}</p>}
      <span className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">
        Updated {relativeTime(m.updatedAt)}
      </span>
    </li>
  );
}

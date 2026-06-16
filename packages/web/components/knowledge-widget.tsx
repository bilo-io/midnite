'use client';

import { BookMarked, RefreshCw } from 'lucide-react';
import type { GlobalSource } from '@midnite/shared';
import { getKnowledgeSources } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn, relativeTime } from '@/lib/utils';
import { SourceIcon } from './source-icon';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 60_000;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function KnowledgeWidget() {
  const { data, error, loading, refresh } = usePolling(() => getKnowledgeSources(), REFRESH_MS);

  const sources = data ?? [];

  return (
    <WidgetCard
      title="Knowledge sources"
      icon={BookMarked}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh sources"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto"
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load sources.</p>
      ) : !data && loading ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : sources.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No knowledge sources yet.</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {sources.map((s) => (
            <SourceRow key={s.id} source={s} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

function SourceRow({ source: s }: { source: GlobalSource }) {
  return (
    <li>
      <a
        href={s.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-4 py-2 hover:bg-accent/40"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <SourceIcon kind={s.kind} faviconUrl={s.faviconUrl} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{s.title ?? hostOf(s.url)}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{hostOf(s.url)}</span>
        </span>
        {s.fetchedAt && (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/70">{relativeTime(s.fetchedAt)}</span>
        )}
      </a>
    </li>
  );
}

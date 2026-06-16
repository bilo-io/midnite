'use client';

import { Newspaper, ArrowUp, MessageSquare, RefreshCw } from 'lucide-react';
import { NEWS_MAX_COUNT, NEWS_MIN_COUNT } from '@midnite/shared';
import { getNews } from '@/lib/api';
import type { WidgetConfig } from '@/lib/dashboard-widgets';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 5 * 60_000;

type NewsWidgetProps = {
  config: WidgetConfig['news'];
  onConfigChange: (config: WidgetConfig['news']) => void;
};

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function relativeTime(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds;
  const h = Math.floor(diff / 3600);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60))}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NewsWidget({ config, onConfigChange }: NewsWidgetProps) {
  const { count } = config;
  const { data, error, loading, refresh } = usePolling(() => getNews(count), REFRESH_MS, [count]);

  const options: number[] = [];
  for (let n = NEWS_MIN_COUNT; n <= NEWS_MAX_COUNT; n++) options.push(n);

  return (
    <WidgetCard
      title="Hacker News"
      icon={Newspaper}
      actions={
        <>
          <select
            value={count}
            onChange={(e) => onConfigChange({ ...config, count: Number(e.target.value) })}
            aria-label="Number of stories"
            className="rounded-md border border-border/60 bg-transparent px-1 py-0.5 text-[10px] text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh stories"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </button>
        </>
      }
      bodyClassName="overflow-auto"
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load stories.</p>
      ) : !data && loading ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ol className="divide-y divide-border/30">
          {data?.map((story, i) => {
            const host = hostOf(story.url);
            const href = story.url ?? `https://news.ycombinator.com/item?id=${story.id}`;
            return (
              <li key={story.id} className="px-4 py-2">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-2 text-sm leading-snug hover:text-primary"
                >
                  <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="font-medium">{story.title}</span>
                    {host && <span className="ml-1 text-xs text-muted-foreground">({host})</span>}
                  </span>
                </a>
                <div className="ml-6 mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5">
                    <ArrowUp className="h-3 w-3" />
                    {story.score}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <MessageSquare className="h-3 w-3" />
                    {story.comments}
                  </span>
                  <span>{relativeTime(story.time)} ago</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </WidgetCard>
  );
}

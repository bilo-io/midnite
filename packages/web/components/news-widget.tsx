'use client';

import { ArrowUp, Clock, LayoutGrid, List, MessageSquare, Newspaper, RefreshCw } from 'lucide-react';
import { NEWS_MAX_COUNT, NEWS_MIN_COUNT, type HackerNewsStory } from '@midnite/shared';
import { getNews } from '@/lib/api';
import type { NewsLayout, WidgetConfig } from '@/lib/dashboard-widgets';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';
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

function hrefFor(story: HackerNewsStory): string {
  return story.url ?? `https://news.ycombinator.com/item?id=${story.id}`;
}

/** Score (HN-orange upvote) · comments · age — shared by both layouts. */
function StoryMeta({ story }: { story: HackerNewsStory }) {
  return (
    <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-0.5 font-medium text-orange-500">
        <ArrowUp className="h-3 w-3" />
        {story.score}
      </span>
      <span className="inline-flex items-center gap-0.5">
        <MessageSquare className="h-3 w-3" />
        {story.comments}
      </span>
      <span className="inline-flex items-center gap-0.5">
        <Clock className="h-3 w-3" />
        {relativeTime(story.time)}
      </span>
    </div>
  );
}

/** Top-three ranks get the accent colour; the rest stay muted. */
function rankClass(i: number): string {
  return i < 3 ? 'text-primary' : 'text-muted-foreground/50';
}

function HostChip({ host }: { host: string }) {
  return (
    <span className="truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{host}</span>
  );
}

function StoryListItem({ story, index }: { story: HackerNewsStory; index: number }) {
  const host = hostOf(story.url);
  return (
    <li>
      <a
        href={hrefFor(story)}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/60"
      >
        <span className={cn('mt-0.5 w-5 shrink-0 text-right text-sm font-semibold tabular-nums', rankClass(index))}>
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
            {story.title}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            {host && <HostChip host={host} />}
            <StoryMeta story={story} />
          </div>
        </div>
      </a>
    </li>
  );
}

function StoryGridCard({ story, index }: { story: HackerNewsStory; index: number }) {
  const host = hostOf(story.url);
  return (
    <a
      href={hrefFor(story)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 p-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm"
    >
      <div className="flex items-start gap-1.5">
        <span className={cn('text-xs font-bold leading-5 tabular-nums', rankClass(index))}>{index + 1}</span>
        <p className="line-clamp-3 text-xs font-medium leading-snug transition-colors group-hover:text-primary">
          {story.title}
        </p>
      </div>
      <div className="mt-auto flex min-w-0 flex-col gap-1">
        {host && <span className="truncate text-[10px] text-muted-foreground">{host}</span>}
        <StoryMeta story={story} />
      </div>
    </a>
  );
}

export function NewsWidget({ config, onConfigChange }: NewsWidgetProps) {
  const { count } = config;
  const layout: NewsLayout = config.layout ?? 'list';
  const { data, error, loading, refresh } = usePolling(() => getNews(count), REFRESH_MS, [count]);

  const options: number[] = [];
  for (let n = NEWS_MIN_COUNT; n <= NEWS_MAX_COUNT; n++) options.push(n);

  const setLayout = (next: NewsLayout) => onConfigChange({ ...config, layout: next });

  return (
    <WidgetCard
      title="Hacker News"
      icon={Newspaper}
      actions={
        <>
          <div className="flex items-center rounded-md border border-border/60 p-0.5">
            {([['list', List], ['grid', LayoutGrid]] as const).map(([value, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setLayout(value)}
                aria-label={`${value} view`}
                aria-pressed={layout === value}
                className={cn(
                  'rounded p-1 transition-colors',
                  layout === value
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3 w-3" />
              </button>
            ))}
          </div>
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
        <WidgetLoader />
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-2 gap-2 p-2">
          {data?.map((story, i) => (
            <StoryGridCard key={story.id} story={story} index={i} />
          ))}
        </div>
      ) : (
        <ol className="space-y-0.5 p-2">
          {data?.map((story, i) => (
            <StoryListItem key={story.id} story={story} index={i} />
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}

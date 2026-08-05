'use client';

import { useTranslations } from 'next-intl';
import { Activity, RefreshCw } from 'lucide-react';
import type { TaskActivityEntry } from '@midnite/shared';
import { useActivityKindLabel } from '@/lib/activity-kind-labels';
import { getTaskActivity } from '@/lib/api';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { useRelativeTimeLabel } from '@/lib/i18n-labels';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 20_000;
const MAX_ROWS = 12;

type Entry = { id: string; title: string; kind: string; at: number };

// Phase 57 C: the feed now comes from GET /tasks/activity (recent events, one
// indexed query) instead of hydrating every task's full event thread.
function toEntries(rows: TaskActivityEntry[]): Entry[] {
  const entries: Entry[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const at = new Date(r.at).getTime();
    if (!Number.isFinite(at)) continue;
    entries.push({ id: `${r.taskId}:${i}`, title: r.title, kind: r.kind, at });
  }
  return entries.sort((a, b) => b.at - a.at).slice(0, MAX_ROWS);
}

export function ActivityWidget() {
  const t = useTranslations('dashboard');
  const widgetLabels = useWidgetLabels();
  const kindLabel = useActivityKindLabel();
  const relativeTime = useRelativeTimeLabel();
  const { data, error, loading, refresh } = usePolling(() => getTaskActivity(MAX_ROWS), REFRESH_MS);

  const entries = data ? toEntries(data) : [];

  return (
    <WidgetCard
      title={widgetLabels.label('activity')}
      icon={Activity}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label={t('activity.refresh')}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto"
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">{t('activity.error')}</p>
      ) : !data && loading ? (
        <WidgetLoader />
      ) : entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t('activity.empty')}</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {entries.map((e) => (
            <li key={e.id} className="flex items-baseline gap-2 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {kindLabel(e.kind)}
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

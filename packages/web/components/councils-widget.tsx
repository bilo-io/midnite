'use client';

import { RefreshCw, Users } from 'lucide-react';
import { AGENT_CLI_LABEL, type Council } from '@midnite/shared';
import { getCouncils } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 60_000;

export function CouncilsWidget() {
  const { data, error, loading, refresh } = usePolling(() => getCouncils(), REFRESH_MS);

  const councils = (data ?? [])
    .filter((c) => !c.archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <WidgetCard
      title="Councils"
      icon={Users}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh councils"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto"
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load councils.</p>
      ) : !data && loading ? (
        <WidgetLoader />
      ) : councils.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No councils yet.</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {councils.map((c) => (
            <CouncilRow key={c.id} council={c} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

function CouncilRow({ council: c }: { council: Council }) {
  return (
    <li className="flex items-center gap-2 px-4 py-2">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{c.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {c.members.length} {c.members.length === 1 ? 'member' : 'members'}
        </span>
      </div>
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        {AGENT_CLI_LABEL[c.synthProvider]}
      </span>
    </li>
  );
}

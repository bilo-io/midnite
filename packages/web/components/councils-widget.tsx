'use client';

import Link from 'next/link';
import { RefreshCw, Users } from 'lucide-react';
import type { Council } from '@midnite/shared';
import { getCouncils } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { AgentCliLogo } from './agent-cli-logo';
import { CouncilStats } from './council-stats';
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
  // One logo per distinct member provider, stacked like the council cards.
  const providers = [...new Set(c.members.map((m) => m.provider))];
  return (
    <li>
      <Link
        href={`/councils/view?id=${c.id}`}
        className="flex items-center gap-2 px-4 py-2 transition-colors hover:bg-accent"
      >
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{c.name}</span>
          {providers.length > 0 ? (
            <span className="mt-1 flex items-center -space-x-1">
              {providers.slice(0, 5).map((cli) => (
                <span
                  key={cli}
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-border/60 bg-background"
                >
                  <AgentCliLogo cli={cli} className="h-2.5 w-2.5" />
                </span>
              ))}
            </span>
          ) : (
            <span className="block text-[11px] text-muted-foreground">No members</span>
          )}
        </div>
        <CouncilStats council={c} />
      </Link>
    </li>
  );
}

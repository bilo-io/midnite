'use client';

import { Bot, RefreshCw } from 'lucide-react';
import { AGENT_CLI_LABEL } from '@midnite/shared';
import { getAgentsConfig, pingAgent } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn, relativeTime } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const CONFIG_REFRESH_MS = 60_000;
// Pinging spawns the agent CLI, so probe sparingly; the button forces a re-check.
const PING_REFRESH_MS = 5 * 60_000;

export function AgentsWidget() {
  const config = usePolling(() => getAgentsConfig(), CONFIG_REFRESH_MS);
  const ping = usePolling(() => pingAgent(), PING_REFRESH_MS);

  const refresh = () => {
    config.refresh();
    ping.refresh();
  };

  const cfg = config.data;

  return (
    <WidgetCard
      title="Agent pool"
      icon={Bot}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh agent status"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', (config.loading || ping.loading) && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto p-4"
    >
      {config.error && !cfg ? (
        <p className="py-6 text-center text-sm text-destructive">Couldn’t load agents.</p>
      ) : !cfg ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <span
              aria-hidden
              className={cn(
                'mt-1 h-2 w-2 shrink-0 rounded-full',
                ping.data ? (ping.data.ok ? 'bg-emerald-500' : 'bg-destructive') : 'bg-muted-foreground/40',
              )}
            />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{cfg.primary.name || 'Primary agent'}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {AGENT_CLI_LABEL[cfg.cli]}
                {ping.data?.model ? ` · ${ping.data.model}` : ''}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {cfg.primary.heartbeatEnabled
              ? `Heartbeat every ${cfg.primary.heartbeatIntervalH}h${
                  cfg.primary.lastHeartbeatAt ? ` · last ${relativeTime(cfg.primary.lastHeartbeatAt)}` : ''
                }`
              : 'Heartbeat off'}
          </p>

          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Sub-agents ({cfg.subAgents.length})
            </span>
            {cfg.subAgents.length === 0 ? (
              <p className="mt-1 text-[11px] text-muted-foreground/60">None configured.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {cfg.subAgents.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate font-medium">{a.name || 'Unnamed'}</span>
                    {a.role && <span className="shrink-0 truncate text-muted-foreground">{a.role}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

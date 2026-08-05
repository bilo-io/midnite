'use client';

import { useTranslations } from 'next-intl';
import { Bot, RefreshCw } from 'lucide-react';
import { AGENT_CLI_LABEL } from '@midnite/shared';
import { getAgentsConfig, pingAgent } from '@/lib/api';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { useRelativeTimeLabel } from '@/lib/i18n-labels';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const CONFIG_REFRESH_MS = 60_000;
// Pinging spawns the agent CLI, so probe sparingly; the button forces a re-check.
const PING_REFRESH_MS = 5 * 60_000;

export function AgentsWidget() {
  const t = useTranslations('dashboard');
  const widgetLabels = useWidgetLabels();
  const relativeTime = useRelativeTimeLabel();
  const config = usePolling(() => getAgentsConfig(), CONFIG_REFRESH_MS);
  const ping = usePolling(() => pingAgent(), PING_REFRESH_MS);

  const refresh = () => {
    config.refresh();
    ping.refresh();
  };

  const cfg = config.data;

  return (
    <WidgetCard
      title={widgetLabels.label('agents')}
      icon={Bot}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label={t('agents.refresh')}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', (config.loading || ping.loading) && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto p-4"
    >
      {config.error && !cfg ? (
        <p className="py-6 text-center text-sm text-destructive">{t('agents.error')}</p>
      ) : !cfg ? (
        <WidgetLoader />
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
              <span className="block truncate text-sm font-semibold">
                {cfg.primary.name || t('agents.primaryFallback')}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {AGENT_CLI_LABEL[cfg.cli]}
                {ping.data?.model ? ` · ${ping.data.model}` : ''}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {!cfg.primary.heartbeatEnabled
              ? t('agents.heartbeatOff')
              : cfg.primary.lastHeartbeatAt
                ? // Two whole phrasings rather than a base string plus an appended fragment:
                  // where the "last seen" clause sits in the sentence is a translator's call.
                  t('agents.heartbeatOnWithLast', {
                    hours: cfg.primary.heartbeatIntervalH,
                    when: relativeTime(cfg.primary.lastHeartbeatAt),
                  })
                : t('agents.heartbeatOn', { hours: cfg.primary.heartbeatIntervalH })}
          </p>

          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('agents.subAgents', { count: cfg.subAgents.length })}
            </span>
            {cfg.subAgents.length === 0 ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{t('agents.noSubAgents')}</p>
            ) : (
              <ul className="mt-1.5 space-y-2">
                {cfg.subAgents.map((a) => (
                  <li key={a.id} className="space-y-0.5">
                    <span className="block truncate text-[11px] font-medium">
                      {a.name || t('agents.unnamed')}
                    </span>
                    {a.role && (
                      <span
                        className="block text-[11px] leading-snug text-muted-foreground line-clamp-2"
                        title={a.role}
                      >
                        {a.role}
                      </span>
                    )}
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

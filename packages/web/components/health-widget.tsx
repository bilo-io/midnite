'use client';

import { useTranslations } from 'next-intl';
import { HeartPulse, RefreshCw } from 'lucide-react';
import { AGENT_CLIS, AGENT_CLI_LABEL, type AgentCli, type AgentCliStatus } from '@midnite/shared';
import { getAgentsConfig, getCliStatuses, getHealth } from '@/lib/api';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const HEALTH_REFRESH_MS = 30_000;
// CLI install-state and the active-CLI preference both change rarely (only when
// the user installs/uninstalls or switches agents in settings), so probe them
// lazily — the refresh button forces an immediate re-check.
const CLI_REFRESH_MS = 2 * 60_000;

export function HealthWidget() {
  const t = useTranslations('dashboard');
  const widgetLabels = useWidgetLabels();
  const health = usePolling((signal) => getHealth(signal), HEALTH_REFRESH_MS);
  const clis = usePolling(() => getCliStatuses(), CLI_REFRESH_MS);
  const agents = usePolling(() => getAgentsConfig(), CLI_REFRESH_MS);

  const gatewayUp = health.data?.ok === true && !health.error;
  const activeCli = agents.data?.cli;
  const cliPending = clis.loading && !clis.data;
  const statusFor = (cli: AgentCli): AgentCliStatus | undefined =>
    clis.data?.find((s) => s.cli === cli);

  const refresh = () => {
    health.refresh();
    clis.refresh();
    agents.refresh();
  };

  return (
    <WidgetCard
      title={widgetLabels.label('health')}
      icon={HeartPulse}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label={t('health.refresh')}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw
            className={cn('h-3 w-3', (health.loading || clis.loading || agents.loading) && 'animate-spin')}
          />
        </button>
      }
      bodyClassName="flex flex-col gap-2.5 overflow-auto p-4"
    >
      <StatusRow
        label={t('health.gateway')}
        activeLabel={t('health.active')}
        ok={health.loading && !health.data ? null : gatewayUp}
        detail={
          gatewayUp
            ? t('health.reachable')
            : health.loading && !health.data
              ? t('health.checking')
              : t('health.unreachable')
        }
      />
      {AGENT_CLIS.map((cli) => {
        const status = statusFor(cli);
        const active = cli === activeCli;
        return (
          <StatusRow
            key={cli}
            label={AGENT_CLI_LABEL[cli]}
            active={active}
            activeLabel={t('health.active')}
            // green when installed; a missing *active* agent is a real fault (red),
            // but any other absent CLI is simply not set up (neutral grey).
            ok={cliPending || !status ? null : status.installed ? true : active ? false : null}
            detail={
              cliPending
                ? t('health.checking')
                : !status
                  ? t('health.unknown')
                  : status.installed
                    ? // A reported version string is the most useful detail; fall back to the
                      // generic phrasing only when the CLI reports none.
                      status.version ?? t('health.installed')
                    : t('health.notInstalled')
            }
          />
        );
      })}
    </WidgetCard>
  );
}

function StatusRow({
  label,
  ok,
  detail,
  active = false,
  activeLabel,
}: {
  label: string;
  ok: boolean | null;
  detail: string;
  active?: boolean;
  /** Copy for the "this is the selected agent" badge; passed in so the row stays presentational. */
  activeLabel: string;
}) {
  // Halo colour tracks the dot: green (up), red (fault), muted (unknown).
  const glow =
    ok === null
      ? 'hsl(var(--muted-foreground) / 0.4)'
      : ok
        ? 'rgb(16 185 129 / 0.7)'
        : 'hsl(var(--destructive) / 0.7)';

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        style={{ ['--glow-color' as string]: glow }}
        className={cn(
          'status-dot-glow h-2.5 w-2.5 shrink-0 rounded-full',
          ok === null ? 'bg-muted-foreground/40' : ok ? 'bg-emerald-500' : 'bg-destructive',
        )}
      />
      <span className="text-sm font-medium">{label}</span>
      {active && (
        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {activeLabel}
        </span>
      )}
      <span className="ml-auto truncate pl-2 text-[11px] text-muted-foreground">{detail}</span>
    </div>
  );
}

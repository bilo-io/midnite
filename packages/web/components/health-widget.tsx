'use client';

import { HeartPulse, RefreshCw } from 'lucide-react';
import { AGENT_CLIS, AGENT_CLI_LABEL, type AgentCli, type AgentCliStatus } from '@midnite/shared';
import { getAgentsConfig, getCliStatuses, getHealth } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const HEALTH_REFRESH_MS = 30_000;
// CLI install-state and the active-CLI preference both change rarely (only when
// the user installs/uninstalls or switches agents in settings), so probe them
// lazily — the refresh button forces an immediate re-check.
const CLI_REFRESH_MS = 2 * 60_000;

export function HealthWidget() {
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
      title="System health"
      icon={HeartPulse}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Re-check health"
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
        label="Gateway"
        ok={health.loading && !health.data ? null : gatewayUp}
        detail={gatewayUp ? 'Reachable' : health.loading && !health.data ? 'Checking…' : 'Unreachable'}
      />
      {AGENT_CLIS.map((cli) => {
        const status = statusFor(cli);
        const active = cli === activeCli;
        return (
          <StatusRow
            key={cli}
            label={AGENT_CLI_LABEL[cli]}
            active={active}
            // green when installed; a missing *active* agent is a real fault (red),
            // but any other absent CLI is simply not set up (neutral grey).
            ok={cliPending || !status ? null : status.installed ? true : active ? false : null}
            detail={
              cliPending
                ? 'Checking…'
                : !status
                  ? 'Unknown'
                  : status.installed
                    ? status.version ?? 'Installed'
                    : 'Not installed'
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
}: {
  label: string;
  ok: boolean | null;
  detail: string;
  active?: boolean;
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
          active
        </span>
      )}
      <span className="ml-auto truncate pl-2 text-[11px] text-muted-foreground">{detail}</span>
    </div>
  );
}

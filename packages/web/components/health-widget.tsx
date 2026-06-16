'use client';

import { HeartPulse, RefreshCw } from 'lucide-react';
import { AGENT_CLI_LABEL } from '@midnite/shared';
import { getHealth, pingAgent } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const HEALTH_REFRESH_MS = 30_000;
// Pinging spawns the agent CLI, so probe sparingly; the button forces a re-check.
const PING_REFRESH_MS = 5 * 60_000;

export function HealthWidget() {
  const health = usePolling((signal) => getHealth(signal), HEALTH_REFRESH_MS);
  const ping = usePolling(() => pingAgent(), PING_REFRESH_MS);

  const gatewayUp = health.data?.ok === true && !health.error;
  const refresh = () => {
    health.refresh();
    ping.refresh();
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
          <RefreshCw className={cn('h-3 w-3', (health.loading || ping.loading) && 'animate-spin')} />
        </button>
      }
      bodyClassName="flex flex-col gap-3 p-4"
    >
      <StatusRow
        label="Gateway"
        ok={health.loading && !health.data ? null : gatewayUp}
        detail={gatewayUp ? 'Reachable' : health.loading && !health.data ? 'Checking…' : 'Unreachable'}
      />
      <StatusRow
        label={ping.data ? AGENT_CLI_LABEL[ping.data.cli] : 'Agent'}
        ok={ping.loading && !ping.data ? null : ping.data?.ok ?? false}
        detail={
          ping.data
            ? ping.data.ok
              ? ping.data.model
              : 'Not installed'
            : ping.loading
              ? 'Checking…'
              : 'Unknown'
        }
      />
    </WidgetCard>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean | null; detail: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          'h-2.5 w-2.5 shrink-0 rounded-full',
          ok === null ? 'bg-muted-foreground/40' : ok ? 'bg-emerald-500' : 'bg-destructive',
        )}
      />
      <span className="text-sm font-medium">{label}</span>
      <span className="ml-auto truncate text-[11px] text-muted-foreground">{detail}</span>
    </div>
  );
}

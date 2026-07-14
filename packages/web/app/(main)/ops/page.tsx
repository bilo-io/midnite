'use client';

import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
import { fetchTasksDoctor, getOpsMetrics, getPoolSnapshot, getUsageSummary } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { useLiveGauges } from '@/hooks/use-metrics-events';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { OpsAddWidget } from '@/components/ops-add-widget';

// react-grid-layout needs the DOM/container width, so the grid is client-only.
const OpsGrid = dynamic(() => import('@/components/ops-grid').then((m) => m.OpsGrid), {
  ssr: false,
});

const POLL_MS = 10_000;
const SPEND_REFRESH_MS = 60_000;

function windowFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function OpsPage() {
  const { data: pool, error: poolErr, loading: poolLoading, refresh: refreshPool } = usePolling(
    () => getPoolSnapshot(),
    POLL_MS,
  );
  const { data: summary, error: summaryErr, loading: summaryLoading, refresh: refreshSummary } = usePolling(
    () => getOpsMetrics(),
    POLL_MS,
  );
  const { data: usage, error: usageErr, loading: usageLoading, refresh: refreshUsage } = usePolling(
    () => getUsageSummary({ from: windowFrom(), groupBy: 'day' }),
    SPEND_REFRESH_MS,
  );
  // Phase 53 E — task-health "what's wedged?" report.
  const { data: doctor, error: doctorErr, refresh: refreshDoctor } = usePolling(
    () => fetchTasksDoctor(),
    POLL_MS,
  );

  // Phase 61 F — live fleet gauges over the reliable WS. When a push is present
  // it patches the polled summary's gauges (the poll stays as the fallback path).
  const liveGauges = useLiveGauges();
  const liveSummary =
    summary && liveGauges ? { ...summary, gauges: liveGauges } : summary;

  useGatewayErrorToast(poolErr ?? summaryErr ?? usageErr ?? doctorErr);

  const loading = poolLoading || summaryLoading || usageLoading;

  function refresh() {
    refreshPool();
    refreshSummary();
    refreshUsage();
    refreshDoctor();
  }

  return (
    <>
      <PageHeader
        title="Ops"
        icon="ActivitySquare"
        description="Fleet health — live slot utilization, run throughput, duration distribution, retry/abandon rates, and LLM spend."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              aria-label="Refresh ops data"
              className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </button>
            <OpsAddWidget />
          </div>
        }
      />

      <OpsGrid pool={pool} summary={liveSummary} usage={usage} doctor={doctor} loading={loading} />
    </>
  );
}
